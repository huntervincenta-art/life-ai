import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a helpful assistant that provides concise, actionable cancel/manage instructions for subscription services and recurring bills.

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

export async function lookupCancelInfo(vendorName, knownUrls = {}) {
  try {
    const userMessage = `Vendor: ${vendorName}\nKnown URLs: ${JSON.stringify(knownUrls)}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    });

    const text = response.content[0]?.text?.trim();
    if (!text) return null;

    const jsonStr = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(jsonStr);

    return {
      cancelMethod: parsed.cancelMethod || '',
      cancelDifficulty: parsed.cancelDifficulty || '',
      cancelUrl: parsed.cancelUrl || '',
      manageUrl: parsed.manageUrl || '',
      loginUrl: parsed.loginUrl || '',
      cancelTip: parsed.tip || '',
    };
  } catch (err) {
    console.error('[CancelHelper] Error:', err.message);
    return null;
  }
}
