import cron from 'node-cron';
import User from '../models/User.js';
import BillTransaction from '../models/BillTransaction.js';
import Vendor from '../models/Vendor.js';
import { scanEmails } from '../services/emailScanner.js';
import { extractBill } from '../services/billExtractor.js';
import { recognizePattern } from '../services/patternRecognizer.js';
import { sendPushToUser } from '../services/pushService.js';

async function runScanForUser(user) {
  const emails = await scanEmails(user);
  let billsExtracted = 0;
  let newBills = 0;

  for (const email of emails) {
    const extracted = await extractBill(email);
    if (!extracted || !extracted.amount) continue;
    billsExtracted++;

    try {
      const bill = await BillTransaction.create({
        vendor: extracted.vendor,
        amount: extracted.amount,
        datePaid: extracted.datePaid ? new Date(extracted.datePaid) : new Date(email.date),
        category: extracted.category,
        paymentMethod: extracted.paymentMethod || '',
        isRecurring: extracted.isRecurring,
        emailSubject: email.subject,
        emailFrom: email.from,
        emailDate: new Date(email.date),
        rawSnippet: email.body.substring(0, 500),
        source: 'email_scan',
        userId: user._id
      });

      newBills++;

      // Store any extracted URLs on the vendor
      const urlFields = {};
      if (extracted.websiteUrl) urlFields.websiteUrl = extracted.websiteUrl;
      if (extracted.manageUrl) urlFields.manageUrl = extracted.manageUrl;
      if (extracted.cancelUrl) urlFields.cancelUrl = extracted.cancelUrl;
      if (extracted.loginUrl) urlFields.loginUrl = extracted.loginUrl;
      if (extracted.payUrl) urlFields.payUrl = extracted.payUrl;
      if (extracted.accountUrl) urlFields.accountUrl = extracted.accountUrl;
      if (extracted.supportPhone) urlFields.supportPhone = extracted.supportPhone;

      // Check if this vendor was previously cancelled — alert if so
      const normalizedName = bill.vendor.toLowerCase().replace(/[^a-z0-9]/g, '');
      const existingVendor = await Vendor.findOne({ normalizedName, userId: user._id });
      if (existingVendor && !existingVendor.isActive) {
        // Vendor was cancelled but a new charge appeared — send push alert
        await sendPushToUser(user._id, {
          title: 'Cancelled bill alert',
          body: `Heads up — ${bill.vendor} charged you $${bill.amount.toFixed(2)} even though you marked it cancelled. Might need to follow up.`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          url: '/',
          tag: `cancelled-charge-${normalizedName}`
        });
      }

      // Update vendor with extracted URLs (merge, don't overwrite existing)
      if (Object.keys(urlFields).length > 0 && existingVendor) {
        const urlUpdate = {};
        for (const [k, v] of Object.entries(urlFields)) {
          if (!existingVendor[k]) urlUpdate[k] = v;
        }
        if (Object.keys(urlUpdate).length > 0) {
          await Vendor.findByIdAndUpdate(existingVendor._id, urlUpdate);
        }
      }

      await recognizePattern(bill.vendor, user._id, bill.category);
    } catch (err) {
      // Duplicate (compound index) — skip silently
      if (err.code !== 11000) {
        console.error(`[EmailScanJob] Save error:`, err.message);
      }
    }
  }

  return { emailsScanned: emails.length, billsExtracted, newBills };
}

export function startEmailScanJob() {
  // Every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      const users = await User.find({ scanEnabled: true });
      for (const user of users) {
        if (!user.gmailUser && !process.env.GMAIL_USER) continue;
        const result = await runScanForUser(user);
        if (result.newBills > 0) {
          console.log(`[EmailScanJob] Scanned ${result.emailsScanned} emails, extracted ${result.billsExtracted} bills, ${result.newBills} new for ${user.email}`);
        }
      }
    } catch (err) {
      console.error('[EmailScanJob] Error:', err.message);
    }
  });

  console.log('[Cron] Email scan job scheduled (every 30 min)');
}

export { runScanForUser };
