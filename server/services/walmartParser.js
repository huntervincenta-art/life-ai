// ─── Walmart Email Parser ───

import { parseProduct } from './foodDatabase.js';

export function parseWalmartEmail(htmlBody, headers = {}) {
  const result = {
    items: [],
    orderNumber: null,
    orderDate: null,
    totalAmount: null,
    paymentLast4: null,
    emailType: 'order_confirmation',
    parseErrors: []
  };

  try {
    // Detect email type
    const subject = headers.subject || '';
    if (/deliver/i.test(subject)) result.emailType = 'delivery';
    else if (/substitut/i.test(subject)) result.emailType = 'substitution';

    // Extract order number
    const orderMatch = htmlBody.match(/Order\s*(?:#|number[:\s]*)\s*(\d[\d-]+\d)/i);
    if (orderMatch) result.orderNumber = orderMatch[1];

    // Extract date
    const dateMatch = htmlBody.match(/(?:placed|ordered|order date)[:\s]*(\w+\s+\d{1,2},?\s+\d{4})/i);
    if (dateMatch) {
      const parsed = new Date(dateMatch[1]);
      if (!isNaN(parsed)) result.orderDate = parsed;
    }
    if (!result.orderDate && headers.date) {
      const parsed = new Date(headers.date);
      if (!isNaN(parsed)) result.orderDate = parsed;
    }

    // Extract total
    const totalMatch = htmlBody.match(/total[^$]*?\$(\d+\.\d{2})/i)
      || htmlBody.match(/Temporary hold:\s*\$(\d+\.\d{2})/i);
    if (totalMatch) result.totalAmount = parseFloat(totalMatch[1]);

    // Extract payment last 4
    const paymentMatch = htmlBody.match(/Ending in\s*(\d{4})/i);
    if (paymentMatch) result.paymentLast4 = paymentMatch[1];

    // Extract items from alt attributes (Walmart format)
    const itemRegex = /alt="(quantity \d+ item[^"]+)"/gi;
    let match;
    while ((match = itemRegex.exec(htmlBody)) !== null) {
      try {
        const parsed = parseProduct(match[1]);
        result.items.push(parsed);
      } catch (e) {
        result.parseErrors.push(`Failed to parse item: ${match[1]} — ${e.message}`);
      }
    }

    // Fallback: try to find items in structured text
    if (result.items.length === 0) {
      const textItemRegex = /(\d+)\s*x\s+(.+?)(?:\s*\$[\d.]+)?$/gm;
      while ((match = textItemRegex.exec(htmlBody)) !== null) {
        try {
          const rawName = `quantity ${match[1]} item ${match[2].trim()}`;
          const parsed = parseProduct(rawName);
          result.items.push(parsed);
        } catch (e) {
          result.parseErrors.push(`Failed to parse text item: ${match[0]} — ${e.message}`);
        }
      }
    }
  } catch (e) {
    result.parseErrors.push(`Parser error: ${e.message}`);
  }

  return result;
}

export function parseWalmartTextEmail(textBody, headers = {}) {
  const result = {
    items: [],
    orderNumber: null,
    orderDate: null,
    totalAmount: null,
    paymentLast4: null,
    emailType: 'order_confirmation',
    parseErrors: []
  };

  try {
    const subject = headers.subject || '';
    if (/deliver/i.test(subject)) result.emailType = 'delivery';
    else if (/substitut/i.test(subject)) result.emailType = 'substitution';

    const orderMatch = textBody.match(/Order\s*(?:#|number[:\s]*)\s*(\d[\d-]+\d)/i);
    if (orderMatch) result.orderNumber = orderMatch[1];

    const totalMatch = textBody.match(/total[^$]*?\$(\d+\.\d{2})/i);
    if (totalMatch) result.totalAmount = parseFloat(totalMatch[1]);

    const paymentMatch = textBody.match(/Ending in\s*(\d{4})/i);
    if (paymentMatch) result.paymentLast4 = paymentMatch[1];

    // Try to extract items from text format
    const lines = textBody.split('\n');
    for (const line of lines) {
      const itemMatch = line.match(/^[\s•-]*(\d+)\s*x?\s+(.+?)(?:\s*\$[\d.]+)?\s*$/);
      if (itemMatch) {
        try {
          const rawName = `quantity ${itemMatch[1]} item ${itemMatch[2].trim()}`;
          const parsed = parseProduct(rawName);
          result.items.push(parsed);
        } catch (e) {
          result.parseErrors.push(`Failed to parse: ${line.trim()}`);
        }
      }
    }
  } catch (e) {
    result.parseErrors.push(`Text parser error: ${e.message}`);
  }

  return result;
}

export function mergeOrderData(orderConfirmation, deliveryConfirmation) {
  const merged = { ...orderConfirmation };

  // Use delivery date if available
  if (deliveryConfirmation.orderDate) {
    merged.deliveryDate = deliveryConfirmation.orderDate;
  }

  // Merge items, deduplicating by cleanName
  const existingNames = new Set(merged.items.map(i => i.cleanName.toLowerCase()));
  for (const item of deliveryConfirmation.items) {
    if (!existingNames.has(item.cleanName.toLowerCase())) {
      merged.items.push(item);
      existingNames.add(item.cleanName.toLowerCase());
    }
  }

  // Prefer delivery total if available
  if (deliveryConfirmation.totalAmount) {
    merged.totalAmount = deliveryConfirmation.totalAmount;
  }

  return merged;
}
