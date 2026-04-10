import { Router } from 'express';
import { PantryItem, Order } from '../models/index.js';
import { parseProduct, estimateShelfLife, classifyProduct, isFood } from '../services/foodDatabase.js';

const router = Router();

// GET /api/pantry — list items with filters
router.get('/', async (req, res) => {
  try {
    const { filter, category, showConsumed } = req.query;
    const query = {};

    if (showConsumed !== 'true') query.isConsumed = false;

    if (filter === 'expiring') {
      const threeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      query.estimatedExpiry = { $lte: threeDays, $gte: new Date() };
      query.isFood = true;
    } else if (filter === 'food') {
      query.isFood = true;
    }

    if (category) query.category = category;

    const items = await PantryItem.find(query).sort({ estimatedExpiry: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pantry/stats
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const threeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [total, food, expiringSoon, expiringThisWeek, expired, categories] = await Promise.all([
      PantryItem.countDocuments({ isConsumed: false }),
      PantryItem.countDocuments({ isConsumed: false, isFood: true }),
      PantryItem.countDocuments({ isConsumed: false, isFood: true, estimatedExpiry: { $lte: threeDays, $gte: now } }),
      PantryItem.countDocuments({ isConsumed: false, isFood: true, estimatedExpiry: { $lte: sevenDays, $gte: now } }),
      PantryItem.countDocuments({ isConsumed: false, isExpired: true }),
      PantryItem.aggregate([
        { $match: { isConsumed: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({ total, food, expiringSoon, expiringThisWeek, expired, categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pantry — add item manually
router.post('/', async (req, res) => {
  try {
    const { name, category, quantity, unit, daysUntilExpiry, isFood: isFoodItem, tags } = req.body;

    const cat = category || classifyProduct(name);
    const days = daysUntilExpiry || estimateShelfLife(name, cat);
    const estimatedExpiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const item = new PantryItem({
      name,
      category: cat,
      quantity: quantity || 1,
      unit: unit || 'item',
      estimatedExpiry,
      daysUntilExpiry: days,
      isFood: isFoodItem !== undefined ? isFoodItem : isFood(name),
      tags
    });

    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/pantry/:id — update item
router.put('/:id', async (req, res) => {
  try {
    const item = await PantryItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/pantry/:id/consume — mark consumed
router.post('/:id/consume', async (req, res) => {
  try {
    const item = await PantryItem.findByIdAndUpdate(req.params.id, {
      isConsumed: true,
      consumedDate: new Date()
    }, { new: true });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/pantry/:id
router.delete('/:id', async (req, res) => {
  try {
    const item = await PantryItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pantry/sync-gmail — sync parsed email data
router.post('/sync-gmail', async (req, res) => {
  try {
    const { emails } = req.body;
    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ error: 'emails array is required' });
    }

    const results = [];
    for (const email of emails) {
      // Check for existing order
      const existing = await Order.findOne({ gmailMessageId: email.gmailMessageId });
      if (existing) {
        results.push({ gmailMessageId: email.gmailMessageId, status: 'skipped', reason: 'already exists' });
        continue;
      }

      // Create order
      const order = new Order({
        gmailMessageId: email.gmailMessageId,
        gmailThreadId: email.gmailThreadId,
        orderNumber: email.orderNumber,
        orderDate: email.orderDate,
        deliveryDate: email.deliveryDate,
        totalAmount: email.totalAmount,
        paymentLast4: email.paymentLast4,
        emailType: email.emailType,
        items: email.items || [],
        parsed: true
      });
      await order.save();

      // Create pantry items for food items
      const pantryItems = [];
      for (const item of (email.items || [])) {
        if (item.isFood === false) continue;

        const parsed = parseProduct(item.rawName || item.cleanName || item.name || '');
        const pantryItem = new PantryItem({
          name: parsed.cleanName || item.cleanName || item.name,
          category: parsed.category || item.category || 'other',
          quantity: item.quantity || 1,
          unit: parsed.unit || 'item',
          purchaseDate: email.orderDate || new Date(),
          estimatedExpiry: parsed.estimatedExpiry,
          daysUntilExpiry: parsed.shelfLifeDays,
          isFood: parsed.isFood,
          rawProductName: item.rawName,
          orderId: order._id,
          pricePerUnit: item.price
        });
        await pantryItem.save();
        pantryItems.push(pantryItem);
      }

      results.push({
        gmailMessageId: email.gmailMessageId,
        status: 'created',
        orderId: order._id,
        pantryItemsCreated: pantryItems.length
      });
    }

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pantry/expiring-ingredients — food expiring within 7 days
router.get('/expiring-ingredients', async (req, res) => {
  try {
    const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const items = await PantryItem.find({
      isConsumed: false,
      isFood: true,
      estimatedExpiry: { $lte: sevenDays, $gte: new Date() }
    }).sort({ estimatedExpiry: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pantry/available-food — all unconsumed food
router.get('/available-food', async (req, res) => {
  try {
    const items = await PantryItem.find({
      isConsumed: false,
      isFood: true
    }).sort({ estimatedExpiry: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
