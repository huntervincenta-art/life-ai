const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const WalmartOrder = require('../models/WalmartOrder');
const PantryItem = require('../models/PantryItem');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/email/parse — extract grocery items from a Walmart order email
router.post('/parse', async (req, res) => {
  try {
    const { emailText } = req.body;

    if (!emailText) {
      return res.status(400).json({ error: 'emailText is required' });
    }

    const prompt = `You are a grocery data extraction assistant. Parse the following Walmart order confirmation email and extract all grocery/food items purchased.

Email text:
"""
${emailText}
"""

Return ONLY a valid JSON object with this structure (no markdown, no explanation):
{
  "orderNumber": "order number if found, else null",
  "orderDate": "ISO date string if found, else null",
  "items": [
    {
      "name": "item name",
      "quantity": 1,
      "unit": "count",
      "category": "one of: Produce, Meat & Seafood, Dairy & Eggs, Frozen, Pantry Staples, Beverages, Snacks, Leftovers, Other",
      "estimatedExpiryDays": 7
    }
  ]
}

For estimatedExpiryDays, use reasonable estimates:
- Produce: 5-10 days
- Meat & Seafood: 2-4 days (raw), longer if frozen
- Dairy & Eggs: 7-14 days
- Frozen: 90-180 days
- Pantry Staples: 180-365 days
- Beverages: 30-365 days depending on type
- Snacks: 30-90 days`;

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = message.content[0].text.trim();
    const jsonStart = rawText.indexOf('{');
    const jsonEnd = rawText.lastIndexOf('}') + 1;
    const parsed = JSON.parse(rawText.slice(jsonStart, jsonEnd));

    // Save to WalmartOrder collection
    const order = new WalmartOrder({
      orderNumber: parsed.orderNumber,
      orderDate: parsed.orderDate ? new Date(parsed.orderDate) : new Date(),
      rawEmailText: emailText,
      parsedItems: parsed.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
      })),
      processed: true,
    });
    await order.save();

    // Upsert each item into PantryItem collection
    const now = new Date();
    for (const item of parsed.items) {
      const estimatedExpiry = item.estimatedExpiryDays
        ? new Date(now.getTime() + item.estimatedExpiryDays * 24 * 60 * 60 * 1000)
        : null;

      await PantryItem.findOneAndUpdate(
        { name: item.name, source: 'walmart_order' },
        {
          name: item.name,
          category: item.category || 'Other',
          quantity: item.quantity || 1,
          unit: item.unit || 'count',
          purchaseDate: order.orderDate,
          estimatedExpiry,
          expiryDays: item.estimatedExpiryDays,
          source: 'walmart_order',
          status: 'fresh',
        },
        { upsert: true, new: true }
      );
    }

    res.json({ order: order._id, items: parsed.items });
  } catch (err) {
    console.error('Email parse error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/email/orders — all Walmart orders sorted by orderDate descending
router.get('/orders', async (req, res) => {
  try {
    const orders = await WalmartOrder.find().sort({ orderDate: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
