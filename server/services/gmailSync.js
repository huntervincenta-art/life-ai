// ─── Gmail Walmart Order Sync Service ───

import { ImapFlow } from 'imapflow';
import { Order, PantryItem, SyncState } from '../models/index.js';
import { parseWalmartEmail } from './walmartParser.js';
import { parseProduct } from './foodDatabase.js';

async function getOrCreateSyncState() {
  let state = await SyncState.findOne();
  if (!state) {
    state = new SyncState();
    await state.save();
  }
  return state;
}

async function createImapClient() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD must be set');
  }

  return new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    },
    logger: false
  });
}

export async function syncWalmartOrders() {
  const syncState = await getOrCreateSyncState();

  // Lock — prevent overlapping syncs
  if (syncState.isRunning) {
    console.log('[GmailSync] Sync already running, skipping');
    return { newOrders: 0, newItems: 0, skipped: true };
  }

  syncState.isRunning = true;
  syncState.lastError = null;
  await syncState.save();

  let client;
  const result = { newOrders: 0, newItems: 0, errors: [] };

  try {
    client = await createImapClient();
    await client.connect();

    // Open the All Mail folder (or INBOX)
    let lock;
    try {
      lock = await client.getMailboxLock('[Gmail]/All Mail');
    } catch {
      // Fallback to INBOX if All Mail isn't available
      lock = await client.getMailboxLock('INBOX');
    }

    try {
      // Build search criteria — Walmart emails, recent
      const searchSince = syncState.lastMessageDate
        ? new Date(syncState.lastMessageDate.getTime() - 24 * 60 * 60 * 1000) // 1 day overlap for safety
        : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Last 90 days on first sync

      const searchCriteria = {
        from: 'walmart.com',
        since: searchSince
      };

      // Search for matching messages
      const messages = [];
      for await (const msg of client.fetch(
        { ...searchCriteria },
        {
          uid: true,
          envelope: true,
          source: true
        },
        { uid: true }
      )) {
        messages.push(msg);
      }

      console.log(`[GmailSync] Found ${messages.length} Walmart emails since ${searchSince.toISOString().split('T')[0]}`);

      let latestDate = syncState.lastMessageDate;

      for (const msg of messages) {
        try {
          const subject = msg.envelope?.subject || '';

          // Filter for order/delivery emails
          const isRelevant = /thanks for your delivery order|delivered|your order/i.test(subject);
          if (!isRelevant) continue;

          const messageId = msg.envelope?.messageId || `uid-${msg.uid}`;

          // Dedup check
          const exists = await Order.findOne({ gmailMessageId: messageId });
          if (exists) continue;

          // Get the full email source
          const rawSource = msg.source?.toString() || '';
          if (!rawSource) continue;

          // Extract HTML body from raw source
          const htmlBody = extractHtmlBody(rawSource);
          if (!htmlBody) {
            result.errors.push(`No HTML body found for: ${subject}`);
            continue;
          }

          // Parse with our Walmart parser
          const parsed = parseWalmartEmail(htmlBody, {
            subject,
            date: msg.envelope?.date?.toISOString()
          });

          // Count expected items from email text for logging
          const expectedMatch = rawSource.match(/(\d+)\s+items?\s+(arrived|delivered)/i)
            || rawSource.match(/\+(\d+)\s+items?/i);
          const expectedCount = expectedMatch ? parseInt(expectedMatch[1]) : null;

          if (expectedCount && parsed.items.length < expectedCount) {
            parsed.parseErrors.push(
              `Expected ~${expectedCount} items but only found ${parsed.items.length} (email truncation)`
            );
          }

          // Create Order document
          const order = new Order({
            gmailMessageId: messageId,
            gmailThreadId: msg.envelope?.messageId,
            orderNumber: parsed.orderNumber,
            orderDate: parsed.orderDate || msg.envelope?.date || new Date(),
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

          // Create PantryItem documents for food items
          for (const item of parsed.items) {
            if (!item.isFood) continue;

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
            result.newItems++;

            // Link back to order
            const orderItem = order.items.find(i => i.rawName === item.rawName);
            if (orderItem) {
              orderItem.pantryItemId = pantryItem._id;
            }
          }
          if (parsed.items.length > 0) {
            await order.save();
          }

          // Track latest email date
          const msgDate = msg.envelope?.date;
          if (msgDate && (!latestDate || msgDate > latestDate)) {
            latestDate = msgDate;
          }

          console.log(`[GmailSync] Processed: ${subject} — ${parsed.items.length} items`);
        } catch (emailErr) {
          const errMsg = `Failed to process email: ${emailErr.message}`;
          console.error(`[GmailSync] ${errMsg}`);
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
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error(`[GmailSync] Sync failed: ${err.message}`);
    syncState.lastError = err.message;
    result.errors.push(err.message);
  } finally {
    // Always disconnect and unlock
    if (client) {
      try { await client.logout(); } catch { /* ignore */ }
    }
    syncState.isRunning = false;
    await syncState.save();
  }

  return result;
}

// Extract HTML body from a raw email source (handles multipart MIME)
function extractHtmlBody(rawSource) {
  // Try to find HTML content between boundaries
  // Look for Content-Type: text/html section
  const htmlMatch = rawSource.match(
    /Content-Type:\s*text\/html[^\r\n]*\r?\n(?:Content-[^\r\n]*\r?\n)*\r?\n([\s\S]*?)(?:\r?\n--|\s*$)/i
  );

  if (htmlMatch) {
    let html = htmlMatch[1];

    // Handle base64 encoding
    if (/Content-Transfer-Encoding:\s*base64/i.test(rawSource.slice(
      Math.max(0, rawSource.indexOf(htmlMatch[0]) - 200),
      rawSource.indexOf(htmlMatch[0])
    ))) {
      try {
        html = Buffer.from(html.replace(/\s/g, ''), 'base64').toString('utf-8');
      } catch { /* use as-is */ }
    }

    // Handle quoted-printable
    if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(rawSource.slice(
      Math.max(0, rawSource.indexOf(htmlMatch[0]) - 200),
      rawSource.indexOf(htmlMatch[0])
    ))) {
      html = decodeQuotedPrintable(html);
    }

    return html;
  }

  // Fallback: if the whole thing looks like HTML
  if (rawSource.includes('<html') || rawSource.includes('<table')) {
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
