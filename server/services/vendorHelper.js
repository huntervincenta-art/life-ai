import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const CANCEL_PROMPT = `You are a helpful assistant that provides concise, actionable cancel/manage instructions for subscription services and recurring bills.

Given the vendor name and any known URLs, provide:
{
  "cancelMethod": "Step-by-step instructions to cancel, in 2-3 short sentences max. Be specific — which menu, which button. If they must call, include the phone number if you know it.",
  "cancelDifficulty": "easy" or "medium" or "hard",
  "cancelUrl": "direct cancel page URL if you know it (e.g. https://www.netflix.com/cancelplan)" or null,
  "manageUrl": "account management URL if you know it" or null,
  "loginUrl": "login page URL if you know it" or null,
  "tip": "One ADHD-friendly tip, e.g. 'Cancel before the 15th to avoid next month charge' or 'Have your account email ready before calling'"
}

Rules:
- Return ONLY valid JSON
- Be specific and actionable, not vague
- If you're not sure about URLs, return null for those fields — don't guess
- cancelDifficulty: easy = can cancel online in a few clicks, medium = have to navigate multiple pages or chat with support, hard = must call a phone number or jump through hoops
- The tip should be genuinely helpful for someone with ADHD who struggles with follow-through`;

const PAY_PROMPT = `You are a helpful assistant that provides concise, actionable payment instructions for bills and subscriptions.

Given the vendor name and any known URLs, provide:
{
  "payMethod": "Step-by-step instructions to pay this bill, in 2-3 short sentences max. Be specific — which page, which button. Include the direct URL if you know it.",
  "payUrl": "direct URL to the payment page if you know it (e.g. https://console.anthropic.com/settings/billing)" or null,
  "accountUrl": "URL to the account dashboard" or null,
  "payDifficulty": "easy" or "medium" or "hard",
  "supportPhone": "customer service phone number if you know it" or null,
  "supportUrl": "support/help page URL if you know it" or null,
  "payTip": "One ADHD-friendly tip, e.g. 'Set up autopay while you are in there so you never have to think about this again' or 'Screenshot your confirmation number after paying'"
}

Rules:
- Return ONLY valid JSON
- Be specific and actionable, not vague
- If you know the direct payment URL for this company, include it — most major services have one
- payDifficulty: easy = pay online with a few clicks or autopay, medium = have to log in and navigate to billing, hard = must call or mail a check
- The tip should help an ADHD brain close the loop completely — ideally suggest setting up autopay or removing the recurring mental burden
- For well-known companies (Netflix, Spotify, Anthropic, AWS, electric companies, etc.) you likely know their billing URLs — include them`;

async function callClaude(systemPrompt, vendorName, knownUrls) {
  const userMessage = `Vendor: ${vendorName}\nKnown URLs: ${JSON.stringify(knownUrls)}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  });

  const text = response.content[0]?.text?.trim();
  if (!text) return null;

  const jsonStr = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
  return JSON.parse(jsonStr);
}

export async function lookupCancelInfo(vendorName, knownUrls = {}) {
  try {
    const parsed = await callClaude(CANCEL_PROMPT, vendorName, knownUrls);
    if (!parsed) return null;

    return {
      cancelMethod: parsed.cancelMethod || '',
      cancelDifficulty: parsed.cancelDifficulty || '',
      cancelUrl: parsed.cancelUrl || '',
      manageUrl: parsed.manageUrl || '',
      loginUrl: parsed.loginUrl || '',
      cancelTip: parsed.tip || '',
    };
  } catch (err) {
    console.error('[VendorHelper] Cancel lookup error:', err.message);
    return null;
  }
}

export async function getPaymentInfo(vendorName, knownUrls = {}) {
  try {
    const parsed = await callClaude(PAY_PROMPT, vendorName, knownUrls);
    if (!parsed) return null;

    return {
      payMethod: parsed.payMethod || '',
      payUrl: parsed.payUrl || '',
      accountUrl: parsed.accountUrl || '',
      payDifficulty: parsed.payDifficulty || '',
      supportPhone: parsed.supportPhone || '',
      supportUrl: parsed.supportUrl || '',
      payTip: parsed.payTip || '',
    };
  } catch (err) {
    console.error('[VendorHelper] Pay lookup error:', err.message);
    return null;
  }
}
