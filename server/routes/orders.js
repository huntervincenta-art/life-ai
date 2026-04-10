import { Router } from 'express';
import { Order } from '../models/index.js';

const router = Router();

// GET /api/orders — list orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ orderDate: -1 }).limit(50);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id — single order
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders/:id/items — manually add items to an order
router.post('/:id/items', async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.items.push(...items);
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
