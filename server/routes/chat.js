import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import ChatSession from '../models/ChatSession.js';
import BillTransaction from '../models/BillTransaction.js';
import Vendor from '../models/Vendor.js';
import { recordCheckIn } from '../services/progressService.js';
import { recognizePattern } from '../services/patternRecognizer.js';

const router = Router();
const client = new Anthropic();

const SYSTEM_PROMPT = `Your name is Pilot. You're the user's friendly AI co-pilot for managing their bills and finances. You're warm, casual, encouraging, and you keep things brief.

You're helping someone with ADHD map out their recurring bills and expenses. Your job is to have a natural 20-minute conversation where you discover all their bills and payments.

RULES:
- Ask about ONE bill or category at a time. Never overwhelm with multiple questions.
- Keep your messages SHORT — 2-3 sentences max. ADHD brains tune out walls of text.
- Be warm, casual, and encouraging. Use language like "nice, got it!" or "cool, what about..."
- After they tell you about a bill, confirm what you heard in a brief summary before moving on.
- Work through categories naturally: housing (rent/mortgage), utilities (electric, gas, water, trash), phone/internet, insurance (car, health, renters), subscriptions (streaming, apps, gym), loans/credit cards, and anything else.
- If they say "I don't know the exact amount" that's fine — ask for a rough estimate and note it.
- If they say "I'm not sure when it's due" — ask if it's beginning, middle, or end of month.
- When you've covered the major categories, ask "Anything else I'm missing? Random subscriptions, annual bills, stuff that sneaks up on you?"
- After each bill they describe, output a hidden JSON block at the END of your message in this exact format:

<!--BILL_DATA:{"vendor":"Netflix","amount":15.99,"billingCycleDays":30,"category":"subscriptions","isRecurring":true,"dayOfMonth":15,"confidence":0.7}-->

- The confidence should reflect how sure the user seemed: exact numbers = 0.9, rough estimates = 0.6, "I think" = 0.4
- If the message is just conversation with no bill info, don't include the BILL_DATA tag
- NEVER show the JSON to the user. It must be inside an HTML comment.
- Don't rush. Let them go at their own pace. If they go off topic briefly, that's fine — gently steer back.
- When wrapping up, give them an encouraging summary: "Awesome — we mapped out X bills totaling roughly $Y per month. Your timeline should be looking a lot more complete now!"

Start by introducing yourself casually and asking about their biggest monthly expense — usually rent or mortgage.`;

const BILL_DATA_REGEX = /<!--BILL_DATA:(.*?)-->/g;

function extractBillData(text) {
  const bills = [];
  let match;
  while ((match = BILL_DATA_REGEX.exec(text)) !== null) {
    try {
      bills.push(JSON.parse(match[1]));
    } catch {
      // Malformed JSON — skip
    }
  }
  // Reset regex lastIndex
  BILL_DATA_REGEX.lastIndex = 0;
  return bills;
}

function cleanMessage(text) {
  return text.replace(/<!--BILL_DATA:.*?-->/g, '').trim();
}

async function callClaude(messages) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages
  });
  return response.content[0]?.text || '';
}

async function saveBillFromChat(billData, userId) {
  const now = new Date();
  const datePaid = now; // Chat bills use today as the reference date

  // Calculate next expected date from dayOfMonth
  let nextExpectedDate = null;
  if (billData.dayOfMonth) {
    const next = new Date(now.getFullYear(), now.getMonth(), billData.dayOfMonth);
    if (next <= now) next.setMonth(next.getMonth() + 1);
    nextExpectedDate = next;
  } else if (billData.billingCycleDays) {
    nextExpectedDate = new Date(now.getTime() + billData.billingCycleDays * 24 * 60 * 60 * 1000);
  }

  try {
    await BillTransaction.create({
      vendor: billData.vendor,
      amount: billData.amount,
      datePaid,
      category: billData.category || 'other',
      isRecurring: billData.isRecurring !== false,
      source: 'manual',
      userId
    });
  } catch (err) {
    // Duplicate — skip
    if (err.code !== 11000) {
      console.error('[Chat] Bill save error:', err.message);
    }
    return;
  }

  // Update/create vendor with chat-provided details
  const normalizedName = billData.vendor.toLowerCase().replace(/[^a-z0-9]/g, '');
  const vendorUpdate = {
    name: billData.vendor,
    normalizedName,
    category: billData.category || 'other',
    lastAmount: billData.amount,
    averageAmount: billData.amount,
    lastPaidDate: datePaid,
    billingCycleDays: billData.billingCycleDays || 30,
    isActive: true,
    userId,
    confidence: billData.confidence || 0.5,
    transactionCount: 1,
    isRecurring: billData.isRecurring !== false,
  };

  if (billData.dayOfMonth) {
    vendorUpdate.billingDayOfMonth = billData.dayOfMonth;
  }
  if (nextExpectedDate) {
    vendorUpdate.nextExpectedDate = nextExpectedDate;
  }

  await Vendor.findOneAndUpdate(
    { normalizedName, userId },
    { $set: vendorUpdate },
    { upsert: true, new: true }
  );

  // Also run pattern recognizer to merge with any existing data
  await recognizePattern(billData.vendor, userId, billData.category);
}

// POST /api/chat/start — start a new session
router.post('/start', async (req, res) => {
  try {
    // Check for existing active session
    const existing = await ChatSession.findOne({ userId: req.user._id, status: 'active' });
    if (existing) {
      return res.json({
        sessionId: existing._id,
        messages: existing.messages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
        billsExtracted: existing.billsExtracted,
        resumed: true
      });
    }

    // Generate first AI message
    const rawResponse = await callClaude([]);
    const cleanedContent = cleanMessage(rawResponse);

    const session = await ChatSession.create({
      userId: req.user._id,
      messages: [{ role: 'assistant', content: cleanedContent }]
    });

    res.json({
      sessionId: session._id,
      messages: [{ role: 'assistant', content: cleanedContent, timestamp: session.messages[0].timestamp }],
      billsExtracted: 0,
      resumed: false
    });
  } catch (err) {
    console.error('[Chat] start error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat/message — send a message
router.post('/message', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId and message required' });
    }

    const session = await ChatSession.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'active') return res.status(400).json({ error: 'Session is not active' });

    // Add user message
    session.messages.push({ role: 'user', content: message });

    // Build conversation history for Claude
    const claudeMessages = session.messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    // Call Claude
    const rawResponse = await callClaude(claudeMessages);

    // Extract bill data before cleaning
    const bills = extractBillData(rawResponse);
    const cleanedContent = cleanMessage(rawResponse);

    // Save extracted bills
    let billExtracted = false;
    for (const bill of bills) {
      if (bill.vendor && bill.amount) {
        await saveBillFromChat(bill, req.user._id);
        session.billsExtracted += 1;
        billExtracted = true;
      }
    }

    // Save cleaned AI message
    session.messages.push({ role: 'assistant', content: cleanedContent });
    await session.save();

    const responseData = {
      message: cleanedContent,
      billExtracted,
      billsTotal: session.billsExtracted,
    };

    // Include extracted bill info for the UI confirmation card
    if (bills.length > 0 && bills[0].vendor) {
      responseData.extractedBill = {
        vendor: bills[0].vendor,
        amount: bills[0].amount,
        billingCycleDays: bills[0].billingCycleDays,
        dayOfMonth: bills[0].dayOfMonth,
      };
    }

    res.json(responseData);
  } catch (err) {
    console.error('[Chat] message error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat/end — end the session
router.post('/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await ChatSession.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    session.status = 'completed';
    session.completedAt = new Date();
    await session.save();
    recordCheckIn(req.user._id, 'chat_completed').catch(() => {});

    res.json({
      billsExtracted: session.billsExtracted,
      summary: `You added ${session.billsExtracted} bill${session.billsExtracted !== 1 ? 's' : ''}`
    });
  } catch (err) {
    console.error('[Chat] end error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/active — check for active session
router.get('/active', async (req, res) => {
  try {
    const session = await ChatSession.findOne({ userId: req.user._id, status: 'active' });
    if (!session) return res.json(null);

    res.json({
      sessionId: session._id,
      messages: session.messages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
      billsExtracted: session.billsExtracted,
      startedAt: session.startedAt
    });
  } catch (err) {
    console.error('[Chat] active error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
