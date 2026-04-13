import { Router } from 'express';
import BillTransaction from '../models/BillTransaction.js';
import Vendor from '../models/Vendor.js';
import { recognizePattern } from '../services/patternRecognizer.js';
import { runScanForUser } from '../jobs/emailScanJob.js';

const router = Router();

// GET /api/bills/timeline — upcoming bills sorted by nextExpectedDate
router.get('/timeline', async (req, res) => {
  try {
    const vendors = await Vendor.find({ userId: req.user._id, isActive: true })
      .sort({ nextExpectedDate: 1 });
    res.json(vendors);
  } catch (err) {
    console.error('[Bills] timeline error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bills/history — all transactions
router.get('/history', async (req, res) => {
  try {
    const { months = 6, category, vendor } = req.query;
    const since = new Date();
    since.setMonth(since.getMonth() - parseInt(months));

    const filter = { userId: req.user._id, datePaid: { $gte: since } };
    if (category) filter.category = category;
    if (vendor) filter.vendor = { $regex: new RegExp(vendor, 'i') };

    const transactions = await BillTransaction.find(filter).sort({ datePaid: -1 });
    res.json(transactions);
  } catch (err) {
    console.error('[Bills] history error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bills/summary
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const vendors = await Vendor.find({ userId: req.user._id, isActive: true });

    let next7Total = 0;
    let next30Total = 0;
    for (const v of vendors) {
      if (v.nextExpectedDate) {
        const amount = v.lastAmount || v.averageAmount;
        if (v.nextExpectedDate <= in7) next7Total += amount;
        if (v.nextExpectedDate <= in30) next30Total += amount;
      }
    }

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTransactions = await BillTransaction.find({
      userId: req.user._id,
      datePaid: { $gte: startOfMonth }
    });

    const spentThisMonth = monthTransactions.reduce((sum, t) => sum + t.amount, 0);

    res.json({
      next7Days: Math.round(next7Total * 100) / 100,
      next30Days: Math.round(next30Total * 100) / 100,
      activeVendors: vendors.length,
      transactionsThisMonth: monthTransactions.length,
      spentThisMonth: Math.round(spentThisMonth * 100) / 100
    });
  } catch (err) {
    console.error('[Bills] summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bills — manually add a bill
router.post('/', async (req, res) => {
  try {
    const { vendor, amount, datePaid, category, isRecurring, billingCycleDays, paymentMethod, nextExpectedDate } = req.body;

    const bill = await BillTransaction.create({
      vendor,
      amount,
      datePaid: datePaid ? new Date(datePaid) : new Date(),
      category: category || 'other',
      paymentMethod: paymentMethod || '',
      isRecurring: isRecurring || false,
      source: 'manual',
      userId: req.user._id
    });

    await recognizePattern(bill.vendor, req.user._id, bill.category);

    // If user provided explicit recurring info, override vendor predictions
    if (isRecurring && (billingCycleDays || nextExpectedDate)) {
      const normalizedName = vendor.toLowerCase().replace(/[^a-z0-9]/g, '');
      const update = {};
      if (billingCycleDays) update.billingCycleDays = billingCycleDays;
      if (nextExpectedDate) update.nextExpectedDate = new Date(nextExpectedDate);
      else if (billingCycleDays) {
        update.nextExpectedDate = new Date(new Date(datePaid || Date.now()).getTime() + billingCycleDays * 24 * 60 * 60 * 1000);
      }
      await Vendor.findOneAndUpdate(
        { normalizedName, userId: req.user._id },
        update
      );
    }

    res.status(201).json(bill);
  } catch (err) {
    console.error('[Bills] create error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/bills/transaction/:id
router.patch('/transaction/:id', async (req, res) => {
  try {
    const bill = await BillTransaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!bill) return res.status(404).json({ error: 'Not found' });

    await recognizePattern(bill.vendor, req.user._id, bill.category);
    res.json(bill);
  } catch (err) {
    console.error('[Bills] update error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bills/transaction/:id
router.delete('/transaction/:id', async (req, res) => {
  try {
    const bill = await BillTransaction.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!bill) return res.status(404).json({ error: 'Not found' });

    await recognizePattern(bill.vendor, req.user._id, bill.category);
    res.json({ deleted: true });
  } catch (err) {
    console.error('[Bills] delete error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/bills/vendor/:id
router.patch('/vendor/:id', async (req, res) => {
  try {
    const allowed = ['nextExpectedDate', 'billingCycleDays', 'billingDayOfMonth', 'category', 'isActive'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const vendor = await Vendor.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      update,
      { new: true }
    );
    if (!vendor) return res.status(404).json({ error: 'Not found' });

    res.json(vendor);
  } catch (err) {
    console.error('[Bills] vendor update error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bills/scan — manual trigger
router.post('/scan', async (req, res) => {
  try {
    const result = await runScanForUser(req.user);
    res.json(result);
  } catch (err) {
    console.error('[Bills] scan error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bills/vendors
router.get('/vendors', async (req, res) => {
  try {
    const vendors = await Vendor.find({ userId: req.user._id }).sort({ name: 1 });
    res.json(vendors);
  } catch (err) {
    console.error('[Bills] vendors error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
