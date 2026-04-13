import Imap from 'imap';
import { simpleParser } from 'mailparser';

const SUBJECT_KEYWORDS = [
  'payment confirmed', 'payment received', 'your bill', 'bill is ready',
  'statement available', 'subscription', 'receipt', 'autopay', 'auto-pay',
  'payment processed', 'thank you for your payment', 'invoice', 'amount due',
  'upcoming payment', 'payment successful', 'transaction alert', 'purchase confirmation'
];

const SENDER_PREFIXES = ['noreply@', 'billing@', 'payments@', 'no-reply@', 'receipt@', 'invoices@', 'statement@'];

function buildSearchCriteria(sinceDate) {
  const since = sinceDate.toISOString().split('T')[0];

  // IMAP OR criteria: group subject keywords and sender prefixes
  const orCriteria = [];
  for (const kw of SUBJECT_KEYWORDS) {
    orCriteria.push(['SUBJECT', kw]);
  }
  for (const prefix of SENDER_PREFIXES) {
    orCriteria.push(['FROM', prefix]);
  }

  // IMAP search: SINCE date AND (subject1 OR subject2 OR from1 OR ...)
  // node-imap doesn't support complex nested OR easily, so we do multiple searches
  return { since, orCriteria };
}

function connectImap(gmailUser, gmailAppPassword) {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: gmailUser,
      password: gmailAppPassword,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000
    });

    imap.once('ready', () => resolve(imap));
    imap.once('error', (err) => reject(err));
    imap.connect();
  });
}

function openInbox(imap) {
  return new Promise((resolve, reject) => {
    imap.openBox('INBOX', true, (err, box) => {
      if (err) reject(err);
      else resolve(box);
    });
  });
}

function searchEmails(imap, criteria) {
  return new Promise((resolve, reject) => {
    imap.search(criteria, (err, results) => {
      if (err) reject(err);
      else resolve(results || []);
    });
  });
}

function fetchEmail(imap, uid) {
  return new Promise((resolve, reject) => {
    const f = imap.fetch(uid, { bodies: '' });
    let rawData = '';

    f.on('message', (msg) => {
      msg.on('body', (stream) => {
        stream.on('data', (chunk) => { rawData += chunk.toString('utf8'); });
      });
    });

    f.once('error', reject);
    f.once('end', async () => {
      try {
        const parsed = await simpleParser(rawData);
        resolve({
          subject: parsed.subject || '',
          from: parsed.from?.text || '',
          date: parsed.date?.toISOString() || new Date().toISOString(),
          body: (parsed.text || '').substring(0, 2000)
        });
      } catch (e) {
        reject(e);
      }
    });
  });
}

export async function scanEmails(user) {
  const gmailUser = user.gmailUser || process.env.GMAIL_USER;
  const gmailAppPassword = user.gmailAppPassword || process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    console.log('[EmailScanner] No Gmail credentials configured');
    return [];
  }

  let imap;
  try {
    imap = await connectImap(gmailUser, gmailAppPassword);
    await openInbox(imap);

    const sinceDate = user.lastScanAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { orCriteria } = buildSearchCriteria(sinceDate);

    // Search for each criteria separately, then deduplicate UIDs
    const allUids = new Set();
    for (const criteria of orCriteria) {
      try {
        const uids = await searchEmails(imap, [['SINCE', sinceDate], criteria]);
        uids.forEach(uid => allUids.add(uid));
      } catch {
        // Some criteria may fail on certain IMAP servers, continue
      }
    }

    const uidArray = Array.from(allUids);
    console.log(`[EmailScanner] Found ${uidArray.length} matching emails since ${sinceDate.toISOString()}`);

    const emails = [];
    for (const uid of uidArray) {
      try {
        const email = await fetchEmail(imap, uid);
        emails.push(email);
      } catch (err) {
        console.error(`[EmailScanner] Failed to fetch email ${uid}:`, err.message);
      }
    }

    // Update lastScanAt
    user.lastScanAt = new Date();
    await user.save();

    imap.end();
    return emails;
  } catch (err) {
    console.error('[EmailScanner] IMAP error:', err.message);
    if (imap) {
      try { imap.end(); } catch {}
    }
    return [];
  }
}

export async function testConnection(gmailUser, gmailAppPassword) {
  let imap;
  try {
    imap = await connectImap(gmailUser, gmailAppPassword);
    imap.end();
    return { success: true };
  } catch (err) {
    if (imap) {
      try { imap.end(); } catch {}
    }
    return { success: false, error: err.message };
  }
}
