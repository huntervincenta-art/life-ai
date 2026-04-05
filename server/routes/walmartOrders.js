const express = require('express');
const router = express.Router();
const Imap = require('node-imap');
const { simpleParser } = require('mailparser');
const Anthropic = require('@anthropic-ai/sdk');
const WalmartOrder = require('../models/WalmartOrder');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function stripHtml(html) {
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function fetchEmailsFromGmail() {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: process.env.GMAIL_USER,
      password: process.env.GMAIL_APP_PASSWORD,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    const messageBuffers = [];

    imap.once('ready', () => {
      imap.openBox('INBOX', true, (err) => {
        if (err) return reject(err);

        const since = new Date();
        since.setDate(since.getDate() - 90);

        imap.search(
          [
            ['SINCE', since],
            ['OR', ['FROM', 'walmart@walmart.com'], ['FROM', 'ship@walmart.com']],
          ],
          (searchErr, uids) => {
            if (searchErr) return reject(searchErr);
            if (!uids || uids.length === 0) {
              imap.end();
              return;
            }

            const fetch = imap.fetch(uids, { bodies: '' });

            fetch.on('message', (msg) => {
              const chunks = [];
              msg.on('body', (stream) => {
                stream.on('data', (chunk) => chunks.push(chunk));
                stream.once('end', () => {
                  messageBuffers.push(Buffer.concat(chunks));
                });
              });
            });

            fetch.once('error', reject);
            fetch.once('end', () => imap.end());
          }
        );
      });
    });

    imap.once('end', () => resolve(messageBuffers));
    imap.once('error', reject);
    imap.connect();
  });
}

async function parseOrderWithClaude(emailText) {
  const truncated = emailText.slice(0, 5000);

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Extract order details from this Walmart email. Return ONLY valid JSON with no extra text:
{
  "orderNumber": "string or null",
  "orderDate": "ISO date string or null",
  "items": [{"name": "string", "quantity": 1, "price": 0.00}],
  "totalAmount": 0.00,
  "deliveryStatus": "string or null"
}

Rules:
- orderNumber: digits only, no # symbol
- orderDate: ISO 8601 format
- items.price: per-item price as a number, null if not found
- totalAmount: the final order total as a number, null if not found
- deliveryStatus: e.g. "Delivered", "Shipped", "Order Confirmed", "Out for Delivery", or null

Email:
"""
${truncated}
"""`,
      },
    ],
  });

  const raw = message.content[0].text.trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}') + 1;
  return JSON.parse(raw.slice(start, end));
}

// GET /api/walmart-orders — fetch from Gmail, parse new emails, return all orders
router.get('/', async (req, res) => {
  try {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return res.status(400).json({ error: 'Gmail credentials (GMAIL_USER, GMAIL_APP_PASSWORD) not configured in .env' });
    }

    const rawBuffers = await fetchEmailsFromGmail();
    let newCount = 0;

    for (const buffer of rawBuffers) {
      try {
        const parsed = await simpleParser(buffer);
        const subject = parsed.subject || '';

        // Must contain "order" in subject
        if (!subject.toLowerCase().includes('order')) continue;

        // Try to extract order number from subject for quick dedup
        const subjectMatch = subject.match(/#?(\d{7,})/);
        const orderNumFromSubject = subjectMatch ? subjectMatch[1] : null;

        if (orderNumFromSubject) {
          const exists = await WalmartOrder.findOne({ orderNumber: orderNumFromSubject });
          if (exists) continue;
        }

        // Get email body text
        let bodyText = parsed.text || '';
        if (!bodyText && parsed.html) {
          bodyText = stripHtml(parsed.html);
        }
        if (!bodyText) continue;

        // Parse with Claude
        const extracted = await parseOrderWithClaude(bodyText);

        const orderNumber = extracted.orderNumber || orderNumFromSubject;

        // Final dedup by orderNumber
        if (orderNumber) {
          const exists = await WalmartOrder.findOne({ orderNumber });
          if (exists) {
            // Update delivery status if changed
            if (extracted.deliveryStatus && exists.deliveryStatus !== extracted.deliveryStatus) {
              await WalmartOrder.findByIdAndUpdate(exists._id, { deliveryStatus: extracted.deliveryStatus });
            }
            continue;
          }
        }

        await WalmartOrder.findOneAndUpdate(
          orderNumber ? { orderNumber } : { _id: new (require('mongoose').Types.ObjectId)() },
          {
            orderNumber,
            orderDate: extracted.orderDate ? new Date(extracted.orderDate) : parsed.date || new Date(),
            rawEmailText: bodyText.slice(0, 5000),
            parsedItems: (extracted.items || []).map((item) => ({
              name: item.name,
              quantity: item.quantity || 1,
              unit: 'count',
              price: item.price != null ? Number(item.price) : undefined,
            })),
            totalAmount: extracted.totalAmount != null ? Number(extracted.totalAmount) : undefined,
            deliveryStatus: extracted.deliveryStatus || null,
            processed: true,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        newCount++;
      } catch (emailErr) {
        console.error('Error processing email:', emailErr.message);
      }
    }

    console.log(`Walmart IMAP: scanned ${rawBuffers.length} emails, saved ${newCount} new`);

    const orders = await WalmartOrder.find().sort({ orderDate: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Walmart orders route error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
