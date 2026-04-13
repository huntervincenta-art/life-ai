import BillTransaction from '../models/BillTransaction.js';
import Vendor from '../models/Vendor.js';
import { lookupCancelInfo } from './cancelHelper.js';

function normalizeVendorName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function recognizePattern(vendorName, userId, category) {
  const normalizedName = normalizeVendorName(vendorName);

  const transactions = await BillTransaction.find({
    userId,
    vendor: { $regex: new RegExp(`^${vendorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
  }).sort({ datePaid: 1 });

  if (transactions.length === 0) {
    // No transactions left — deactivate vendor if exists
    await Vendor.findOneAndUpdate(
      { normalizedName, userId },
      { isActive: false, transactionCount: 0 }
    );
    return;
  }

  const latest = transactions[transactions.length - 1];
  const amounts = transactions.map(t => t.amount);
  const averageAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

  const vendorData = {
    name: latest.vendor,
    normalizedName,
    category: category || latest.category || 'other',
    lastAmount: latest.amount,
    averageAmount: Math.round(averageAmount * 100) / 100,
    lastPaidDate: latest.datePaid,
    transactionCount: transactions.length,
    isActive: true,
    userId
  };

  if (transactions.length >= 2) {
    // Calculate intervals between payments
    const intervals = [];
    for (let i = 1; i < transactions.length; i++) {
      const daysBetween = Math.round(
        (transactions[i].datePaid - transactions[i - 1].datePaid) / (1000 * 60 * 60 * 24)
      );
      if (daysBetween > 0) intervals.push(daysBetween);
    }

    if (intervals.length > 0) {
      const avgCycle = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
      vendorData.billingCycleDays = avgCycle;

      // Check for consistent day-of-month
      const daysOfMonth = transactions.map(t => new Date(t.datePaid).getDate());
      const uniqueDays = [...new Set(daysOfMonth)];
      if (uniqueDays.length === 1) {
        vendorData.billingDayOfMonth = uniqueDays[0];
      } else {
        // Check if most are the same (allow 1 outlier)
        const dayFreq = {};
        daysOfMonth.forEach(d => { dayFreq[d] = (dayFreq[d] || 0) + 1; });
        const mostCommon = Object.entries(dayFreq).sort((a, b) => b[1] - a[1])[0];
        if (mostCommon[1] >= daysOfMonth.length * 0.7) {
          vendorData.billingDayOfMonth = parseInt(mostCommon[0]);
        }
      }

      // Predict next date
      vendorData.nextExpectedDate = new Date(latest.datePaid.getTime() + avgCycle * 24 * 60 * 60 * 1000);

      // Confidence based on transaction count
      const count = transactions.length;
      vendorData.confidence = count === 2 ? 0.4 : count === 3 ? 0.6 : count === 4 ? 0.75 : 0.9;
    }
  } else if (transactions.length === 1 && latest.isRecurring) {
    // Single recurring transaction — assume monthly
    vendorData.billingCycleDays = 30;
    vendorData.nextExpectedDate = new Date(latest.datePaid.getTime() + 30 * 24 * 60 * 60 * 1000);
    vendorData.confidence = 0.2;
  }

  const vendor = await Vendor.findOneAndUpdate(
    { normalizedName, userId },
    vendorData,
    { upsert: true, new: true }
  );

  // Look up cancel/manage info once per vendor (only if not already populated)
  if (!vendor.cancelMethod) {
    try {
      const knownUrls = {
        websiteUrl: vendor.websiteUrl || '',
        manageUrl: vendor.manageUrl || '',
        cancelUrl: vendor.cancelUrl || '',
        loginUrl: vendor.loginUrl || '',
      };
      const cancelInfo = await lookupCancelInfo(vendor.name, knownUrls);
      if (cancelInfo) {
        const update = {};
        if (cancelInfo.cancelMethod) update.cancelMethod = cancelInfo.cancelMethod;
        if (cancelInfo.cancelDifficulty) update.cancelDifficulty = cancelInfo.cancelDifficulty;
        if (cancelInfo.cancelTip) update.cancelTip = cancelInfo.cancelTip;
        // Only fill in URLs that aren't already set
        if (cancelInfo.cancelUrl && !vendor.cancelUrl) update.cancelUrl = cancelInfo.cancelUrl;
        if (cancelInfo.manageUrl && !vendor.manageUrl) update.manageUrl = cancelInfo.manageUrl;
        if (cancelInfo.loginUrl && !vendor.loginUrl) update.loginUrl = cancelInfo.loginUrl;
        if (Object.keys(update).length > 0) {
          await Vendor.findByIdAndUpdate(vendor._id, update);
        }
      }
    } catch (err) {
      console.error('[PatternRecognizer] Cancel lookup error:', err.message);
    }
  }
}
