const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const PantryItem = require('../models/PantryItem');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// GET /api/pantry — all items sorted by estimatedExpiry ascending
router.get('/', async (req, res) => {
  try {
    const items = await PantryItem.find().sort({ estimatedExpiry: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pantry — add a single item manually
router.post('/', async (req, res) => {
  try {
    const { name, category, quantity, unit, purchaseDate, estimatedExpiry, expiryDays, notes } =
      req.body;

    const item = new PantryItem({
      name,
      category,
      quantity,
      unit,
      purchaseDate,
      estimatedExpiry,
      expiryDays,
      notes,
      source: 'manual',
    });

    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/pantry/:id — update quantity, status, or notes
router.patch('/:id', async (req, res) => {
  try {
    const { quantity, status, notes } = req.body;
    const update = {};
    if (quantity !== undefined) update.quantity = quantity;
    if (status !== undefined) update.status = status;
    if (notes !== undefined) update.notes = notes;

    const item = await PantryItem.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/pantry/:id — remove an item
router.delete('/:id', async (req, res) => {
  try {
    const item = await PantryItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pantry/analyze — ask Claude for recipe suggestions
router.post('/analyze', async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const itemList = items
      .map((item) => {
        const daysLeft = item.estimatedExpiry
          ? Math.ceil(
              (new Date(item.estimatedExpiry) - new Date()) / (1000 * 60 * 60 * 24)
            )
          : null;
        return `- ${item.name} (${item.quantity} ${item.unit || 'units'}, category: ${item.category}${daysLeft !== null ? `, expires in ${daysLeft} day(s)` : ''})`;
      })
      .join('\n');

    const prompt = `You are a helpful home chef. Based on the following pantry items, suggest 3-5 recipes that use as many of them as possible. Prioritize ingredients that are expiring soonest.

Pantry items:
${itemList}

Return ONLY a valid JSON array with this structure (no markdown, no explanation):
[
  {
    "name": "Recipe Name",
    "ingredients": ["ingredient 1", "ingredient 2"],
    "prepTimeMinutes": 30,
    "instructions": ["Step 1", "Step 2"],
    "expiringIngredients": ["ingredient that expires soon"]
  }
]`;

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = message.content[0].text.trim();
    const jsonStart = rawText.indexOf('[');
    const jsonEnd = rawText.lastIndexOf(']') + 1;
    const jsonStr = rawText.slice(jsonStart, jsonEnd);
    const recipes = JSON.parse(jsonStr);

    res.json(recipes);
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
