import cron from 'node-cron';
import User from '../models/User.js';
import BillTransaction from '../models/BillTransaction.js';
import { scanEmails } from '../services/emailScanner.js';
import { extractBill } from '../services/billExtractor.js';
import { recognizePattern } from '../services/patternRecognizer.js';

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
