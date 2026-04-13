import BillTransaction from '../models/BillTransaction.js';
import Vendor from '../models/Vendor.js';
import { lookupCancelInfo, getPaymentInfo } from './vendorHelper.js';

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

      // Calculate variance — how inconsistent are the intervals?
      const maxInterval = Math.max(...intervals);
      const minInterval = Math.min(...intervals);
      const variance = avgCycle > 0 ? (maxInterval - minInterval) / avgCycle : 1;
      const isHighVariance = variance > 0.5;
      const isShortCycle = avgCycle < 14;

      // Classify billing pattern
      let billingPattern = 'unknown';
      if (isHighVariance || isShortCycle) {
        billingPattern = 'irregular';
      } else if (avgCycle >= 6 && avgCycle <= 8 && !isHighVariance) {
        billingPattern = 'weekly';
      } else if (avgCycle >= 25 && avgCycle <= 35 && !isHighVariance) {
        billingPattern = 'monthly';
      } else if (avgCycle >= 85 && avgCycle <= 100 && !isHighVariance) {
        billingPattern = 'quarterly';
      } else if (avgCycle >= 350 && avgCycle <= 380 && !isHighVariance) {
        billingPattern = 'annual';
      } else if (!isHighVariance && avgCycle >= 14) {
        billingPattern = 'monthly'; // default for reasonable consistent cycles
      }

      vendorData.billingPattern = billingPattern;

      if (isShortCycle) {
        // Too short — likely on-demand purchases, not a recurring bill
        vendorData.billingCycleDays = null;
        vendorData.confidence = 0.1;
        vendorData.nextExpectedDate = null;
      } else if (isHighVariance) {
        // Inconsistent intervals — don't predict
        vendorData.billingCycleDays = avgCycle;
        vendorData.confidence = Math.min(0.3, transactions.length * 0.1);
        vendorData.nextExpectedDate = null;
      } else if (transactions.length === 2) {
        // Only 2 transactions — only predict if likely monthly and was marked recurring
        vendorData.billingCycleDays = avgCycle;
        if (latest.isRecurring && avgCycle >= 25 && avgCycle <= 35) {
          vendorData.nextExpectedDate = new Date(latest.datePaid.getTime() + avgCycle * 24 * 60 * 60 * 1000);
          vendorData.confidence = 0.4;
        } else {
          vendorData.confidence = 0.2;
          vendorData.nextExpectedDate = null;
          if (billingPattern === 'monthly') vendorData.billingPattern = 'unknown';
        }
      } else {
        // 3+ transactions with consistent intervals — confident prediction
        vendorData.billingCycleDays = avgCycle;
        vendorData.nextExpectedDate = new Date(latest.datePaid.getTime() + avgCycle * 24 * 60 * 60 * 1000);

        const count = transactions.length;
        vendorData.confidence = count === 3 ? 0.6 : count === 4 ? 0.75 : 0.9;
      }

      // Check for consistent day-of-month (only for confident predictions)
      if (vendorData.confidence >= 0.4 && !isHighVariance) {
        const daysOfMonth = transactions.map(t => new Date(t.datePaid).getDate());
        const uniqueDays = [...new Set(daysOfMonth)];
        if (uniqueDays.length === 1) {
          vendorData.billingDayOfMonth = uniqueDays[0];
        } else {
          const dayFreq = {};
          daysOfMonth.forEach(d => { dayFreq[d] = (dayFreq[d] || 0) + 1; });
          const mostCommon = Object.entries(dayFreq).sort((a, b) => b[1] - a[1])[0];
          if (mostCommon[1] >= daysOfMonth.length * 0.7) {
            vendorData.billingDayOfMonth = parseInt(mostCommon[0]);
          }
        }
      }
    }
  } else if (transactions.length === 1 && latest.isRecurring) {
    // Single recurring transaction — assume monthly but low confidence
    vendorData.billingCycleDays = 30;
    vendorData.nextExpectedDate = new Date(latest.datePaid.getTime() + 30 * 24 * 60 * 60 * 1000);
    vendorData.confidence = 0.2;
    vendorData.billingPattern = 'unknown';
  } else if (transactions.length === 1) {
    vendorData.billingPattern = 'unknown';
    vendorData.confidence = 0.1;
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

  // Look up payment info once per vendor (only if not already populated)
  // Re-read vendor since cancel lookup may have updated it
  const vendorNow = await Vendor.findById(vendor._id);
  if (vendorNow && !vendorNow.payMethod) {
    try {
      const knownUrls = {
        websiteUrl: vendorNow.websiteUrl || '',
        manageUrl: vendorNow.manageUrl || '',
        payUrl: vendorNow.payUrl || '',
        accountUrl: vendorNow.accountUrl || '',
        loginUrl: vendorNow.loginUrl || '',
      };
      const payInfo = await getPaymentInfo(vendorNow.name, knownUrls);
      if (payInfo) {
        const update = {};
        if (payInfo.payMethod) update.payMethod = payInfo.payMethod;
        if (payInfo.payDifficulty) update.payDifficulty = payInfo.payDifficulty;
        if (payInfo.payTip) update.payTip = payInfo.payTip;
        if (payInfo.payUrl && !vendorNow.payUrl) update.payUrl = payInfo.payUrl;
        if (payInfo.accountUrl && !vendorNow.accountUrl) update.accountUrl = payInfo.accountUrl;
        if (payInfo.supportPhone && !vendorNow.supportPhone) update.supportPhone = payInfo.supportPhone;
        if (payInfo.supportUrl && !vendorNow.supportUrl) update.supportUrl = payInfo.supportUrl;
        if (Object.keys(update).length > 0) {
          await Vendor.findByIdAndUpdate(vendorNow._id, update);
        }
      }
    } catch (err) {
      console.error('[PatternRecognizer] Pay lookup error:', err.message);
    }
  }
}
