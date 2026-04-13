import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a bill/payment extraction engine. Given an email's subject, sender, date, and body text, extract payment information.

Return a JSON object with these fields:
{
  "vendor": "human-readable company name (e.g. 'Netflix' not 'noreply@netflix.com')",
  "amount": number (e.g. 14.99) or null if not found,
  "datePaid": "YYYY-MM-DD" or null,
  "category": one of ["utilities", "subscriptions", "insurance", "rent", "phone", "internet", "groceries", "medical", "loan", "credit_card", "other"],
  "paymentMethod": "last 4 digits of card/account" or null,
  "isRecurring": true or false (true if it mentions recurring/monthly/subscription/autopay),
  "confidence": number 0-1 representing how confident you are this is a real bill/payment,
  "websiteUrl": "main website URL if found in email" or null,
  "manageUrl": "direct link to manage account/subscription if found in email footer" or null,
  "cancelUrl": "direct link to cancel if found" or null,
  "loginUrl": "link to login/sign in if found" or null
}

Rules:
- Return ONLY valid JSON, no explanation or markdown
- If confidence is below 0.5, return {"confidence": 0} and nothing else
- Marketing emails, promotions, shipping notifications, and ads are NOT bills — give them confidence 0
- "Your order has shipped" or "delivery update" is NOT a bill
- Only extract if there's a clear payment, charge, bill, or subscription event
- For vendor name, use the clean human-readable brand name
- If amount is mentioned multiple times, use the total/final amount
- Look carefully at the email body for URLs. Bill emails almost always contain links to "Manage your account", "View your bill", "Update payment", "Cancel subscription", "Sign in", or similar. Extract the most useful ones.
- For manageUrl, prioritize links labeled "manage", "account settings", "subscription", "billing"
- For cancelUrl, look for links labeled "cancel", "unsubscribe from service", "end subscription"
- For loginUrl, look for "sign in", "log in", "view account"
- The websiteUrl is just the base domain of the sender`;

export async function extractBill(email) {
  try {
    const userMessage = `Subject: ${email.subject}\nFrom: ${email.from}\nDate: ${email.date}\nBody: ${email.body}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    });

    const text = response.content[0]?.text?.trim();
    if (!text) return null;

    // Strip markdown code fences if present
    const jsonStr = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(jsonStr);

    if (!parsed.confidence || parsed.confidence < 0.5) return null;

    return {
      vendor: parsed.vendor,
      amount: parsed.amount,
      datePaid: parsed.datePaid,
      category: parsed.category || 'other',
      paymentMethod: parsed.paymentMethod || '',
      isRecurring: parsed.isRecurring || false,
      confidence: parsed.confidence,
      websiteUrl: parsed.websiteUrl || '',
      manageUrl: parsed.manageUrl || '',
      cancelUrl: parsed.cancelUrl || '',
      loginUrl: parsed.loginUrl || '',
    };
  } catch (err) {
    console.error('[BillExtractor] Error:', err.message);
    return null;
  }
}
