// ─── Gmail Walmart Order Sync Service ───

import { ImapFlow } from 'imapflow';
import { Order, PantryItem, SyncState } from '../models/index.js';
import { parseWalmartEmail } from './walmartParser.js';

// ─── In-memory sync log (last 50 entries) ───
const syncLog = [];
const MAX_LOG = 50;

function log(level, message) {
  const entry = { timestamp: new Date().toISOString(), level, message };
  syncLog.push(entry);
  if (syncLog.length > MAX_LOG) syncLog.shift();
  const prefix = `[GmailSync] [${level.toUpperCase()}]`;
  if (level === 'error') console.error(`${prefix} ${message}`);
  else console.log(`${prefix} ${message}`);
}

export function getSyncLog() {
  return [...syncLog].reverse(); // newest first
}

async function getOrCreateSyncState() {
  let state = await SyncState.findOne();
  if (!state) {
    state = new SyncState();
    await state.save();
  }
  return state;
}

export async function syncWalmartOrders() {
  const syncState = await getOrCreateSyncState();

  // Lock — prevent overlapping syncs
  if (syncState.isRunning) {
    log('warn', 'Sync already running, skipping');
    return { newOrders: 0, newItems: 0, skipped: true };
  }

  syncState.isRunning = true;
  syncState.lastError = null;
  await syncState.save();

  const result = { newOrders: 0, newItems: 0, errors: [], log: [] };

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    const msg = 'GMAIL_USER and GMAIL_APP_PASSWORD must be set in environment';
    log('error', msg);
    syncState.isRunning = false;
    syncState.lastError = msg;
    await syncState.save();
    result.errors.push(msg);
    return result;
  }

  let client;
  try {
    log('info', `Connecting to imap.gmail.com as ${process.env.GMAIL_USER}...`);

    client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      },
      logger: false
    });

    await client.connect();
    log('info', 'IMAP connected successfully');

    // Open INBOX (most reliable across Gmail configs)
    let lock;
    try {
      lock = await client.getMailboxLock('INBOX');
      log('info', 'Opened INBOX');
    } catch (inboxErr) {
      log('error', `Failed to open INBOX: ${inboxErr.message}`);
      throw inboxErr;
    }

    try {
      // Determine search date range
      const searchSince = syncState.lastMessageDate
        ? new Date(syncState.lastMessageDate.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 day overlap
        : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days on first sync

      log('info', `Searching for Walmart emails since ${searchSince.toISOString().split('T')[0]}`);

      // Step 1: SEARCH for matching UIDs
      const uids = await client.search(
        { from: 'walmart.com', since: searchSince },
        { uid: true }
      );

      log('info', `Search found ${uids.length} Walmart emails`);

      if (uids.length === 0) {
        syncState.lastSyncAt = new Date();
        return result;
      }

      let latestDate = syncState.lastMessageDate;

      // Step 2: FETCH each message
      for (const uid of uids) {
        try {
          // Fetch envelope + full raw source
          const msg = await client.fetchOne(String(uid), {
            uid: true,
            envelope: true,
            source: true
          }, { uid: true });

          const subject = msg.envelope?.subject || '';
          const msgDate = msg.envelope?.date;
          const messageId = msg.envelope?.messageId || `uid-${uid}`;

          // Filter for order/delivery emails only
          const isRelevant = /thanks for your (delivery )?order|delivered|substitut/i.test(subject);
          if (!isRelevant) {
            continue;
          }

          log('info', `Processing: "${subject}" (${msgDate?.toISOString()?.split('T')[0] || 'no date'})`);

          // Dedup check
          const exists = await Order.findOne({ gmailMessageId: messageId });
          if (exists) {
            log('info', `  Skipped (already in DB): ${messageId}`);
            continue;
          }

          // Get raw email source
          const rawSource = msg.source ? msg.source.toString('utf-8') : '';
          if (!rawSource) {
            log('warn', `  No source body for: ${subject}`);
            result.errors.push(`No source body for: ${subject}`);
            continue;
          }

          log('info', `  Raw source size: ${rawSource.length} bytes`);

          // Extract HTML body from the raw MIME source
          const htmlBody = extractHtmlFromMime(rawSource);
          if (!htmlBody) {
            log('warn', `  No HTML body extracted for: ${subject}`);
            result.errors.push(`No HTML body found for: ${subject}`);
            continue;
          }

          log('info', `  HTML body size: ${htmlBody.length} chars`);

          // Check for alt= tags before parsing
          const altCount = (htmlBody.match(/alt="quantity/gi) || []).length;
          log('info', `  Found ${altCount} alt="quantity..." tags`);

          // Parse with our Walmart parser
          const parsed = parseWalmartEmail(htmlBody, {
            subject,
            date: msgDate?.toISOString()
          });

          log('info', `  Parsed: ${parsed.items.length} items, order# ${parsed.orderNumber || 'unknown'}, type: ${parsed.emailType}`);

          if (parsed.parseErrors.length > 0) {
            log('warn', `  Parse errors: ${parsed.parseErrors.join('; ')}`);
          }

          // Create Order document
          const order = new Order({
            gmailMessageId: messageId,
            gmailThreadId: msg.envelope?.inReplyTo || messageId,
            orderNumber: parsed.orderNumber,
            orderDate: parsed.orderDate || msgDate || new Date(),
            totalAmount: parsed.totalAmount,
            paymentLast4: parsed.paymentLast4,
            emailType: parsed.emailType,
            items: parsed.items.map(item => ({
              rawName: item.rawName,
              cleanName: item.cleanName,
              quantity: item.quantity,
              price: null,
              category: item.category
            })),
            parsed: true,
            parseErrors: parsed.parseErrors
          });
          await order.save();
          result.newOrders++;
          log('info', `  Order saved: ${order._id}`);

          // Create PantryItem documents for food items
          let itemsSaved = 0;
          for (const item of parsed.items) {
            if (!item.isFood) {
              log('info', `  Skipped non-food: ${item.cleanName}`);
              continue;
            }

            const pantryItem = new PantryItem({
              name: item.cleanName,
              category: item.category,
              quantity: item.quantity,
              unit: item.unit || 'item',
              purchaseDate: order.orderDate,
              estimatedExpiry: item.estimatedExpiry,
              daysUntilExpiry: item.shelfLifeDays,
              isFood: true,
              rawProductName: item.rawName,
              orderId: order._id
            });
            await pantryItem.save();
            itemsSaved++;
            result.newItems++;

            // Link back to order
            const orderItem = order.items.find(i => i.rawName === item.rawName);
            if (orderItem) {
              orderItem.pantryItemId = pantryItem._id;
            }
          }

          if (parsed.items.length > 0) {
            await order.save(); // save pantryItemId links
          }

          log('info', `  Saved ${itemsSaved} pantry items`);

          // Track latest email date
          if (msgDate && (!latestDate || msgDate > latestDate)) {
            latestDate = msgDate;
          }
        } catch (emailErr) {
          const errMsg = `Failed to process UID ${uid}: ${emailErr.message}`;
          log('error', errMsg);
          result.errors.push(errMsg);
        }
      }

      // Update sync state
      syncState.lastSyncAt = new Date();
      if (latestDate) syncState.lastMessageDate = latestDate;
      syncState.totalOrdersSynced += result.newOrders;
      syncState.totalItemsSynced += result.newItems;
      if (result.errors.length > 0) {
        syncState.lastError = result.errors[result.errors.length - 1];
      }

      log('info', `Sync complete: ${result.newOrders} new orders, ${result.newItems} new items`);
    } finally {
      lock.release();
    }
  } catch (err) {
    const errMsg = `Sync failed: ${err.message}`;
    log('error', errMsg);
    syncState.lastError = err.message;
    result.errors.push(err.message);
  } finally {
    if (client) {
      try { await client.logout(); } catch { /* ignore */ }
    }
    syncState.isRunning = false;
    await syncState.save();
  }

  return result;
}

// ─── MIME HTML Extraction ───

function extractHtmlFromMime(rawSource) {
  // Strategy 1: Find the boundary, then find the text/html part
  const boundaryMatch = rawSource.match(/boundary="?([^"\r\n;]+)"?/i);

  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    // Split by boundary
    const parts = rawSource.split('--' + boundary);

    for (const part of parts) {
      // Look for text/html content type
      if (!/content-type:\s*text\/html/i.test(part)) continue;

      // Determine transfer encoding
      const isBase64 = /content-transfer-encoding:\s*base64/i.test(part);
      const isQP = /content-transfer-encoding:\s*quoted-printable/i.test(part);

      // Extract the body (after the double newline that separates headers from content)
      const bodyStart = part.search(/\r?\n\r?\n/);
      if (bodyStart === -1) continue;
      let body = part.slice(bodyStart).trim();

      // Remove trailing boundary marker
      const trailingBoundary = body.indexOf('\r\n--');
      if (trailingBoundary !== -1) {
        body = body.slice(0, trailingBoundary);
      }

      if (isBase64) {
        try {
          body = Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf-8');
        } catch { /* use as-is */ }
      } else if (isQP) {
        body = decodeQuotedPrintable(body);
      }

      // Verify it actually looks like HTML
      if (body.includes('<') && (body.includes('html') || body.includes('table') || body.includes('div'))) {
        return body;
      }
    }

    // Recursive: some emails have nested multipart boundaries
    for (const part of parts) {
      const nestedBoundary = part.match(/boundary="?([^"\r\n;]+)"?/i);
      if (nestedBoundary && nestedBoundary[1] !== boundary) {
        const nested = extractHtmlFromMime(part);
        if (nested) return nested;
      }
    }
  }

  // Strategy 2: Direct regex for non-multipart or when boundary parsing fails
  // Look for Content-Type: text/html followed by content
  const htmlSectionMatch = rawSource.match(
    /content-type:\s*text\/html[^\r\n]*(?:\r?\n[^\r\n]+)*?\r?\n\r?\n([\s\S]+?)(?=\r?\n--[^\r\n]|\s*$)/i
  );

  if (htmlSectionMatch) {
    let html = htmlSectionMatch[1].trim();
    // Check encoding in the preceding headers
    const headerArea = rawSource.slice(
      Math.max(0, rawSource.indexOf(htmlSectionMatch[0]) - 300),
      rawSource.indexOf(htmlSectionMatch[0]) + 100
    );
    if (/content-transfer-encoding:\s*base64/i.test(headerArea)) {
      try {
        html = Buffer.from(html.replace(/\s/g, ''), 'base64').toString('utf-8');
      } catch { /* use as-is */ }
    } else if (/content-transfer-encoding:\s*quoted-printable/i.test(headerArea)) {
      html = decodeQuotedPrintable(html);
    }
    if (html.includes('<')) return html;
  }

  // Strategy 3: If the whole source looks like HTML
  if (rawSource.includes('<html') || rawSource.includes('alt="quantity')) {
    return rawSource;
  }

  return null;
}

function decodeQuotedPrintable(str) {
  return str
    .replace(/=\r?\n/g, '') // soft line breaks
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export async function getSyncStatus() {
  return getOrCreateSyncState();
}
