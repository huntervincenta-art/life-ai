import { Router } from 'express';
import { CountryCode, Products } from 'plaid';
import plaidClient from './plaidClient.js';

const router = Router();

// Create a link token for Plaid Link
router.post('/create-link-token', async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: req.user._id.toString() },
      client_name: 'Life AI',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    });
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error('[Plaid] Link token error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

// Exchange public token for access token and store it
router.post('/exchange-public-token', async (req, res) => {
  try {
    const { public_token, institution } = req.body;
    if (!public_token) {
      return res.status(400).json({ error: 'public_token is required' });
    }

    const response = await plaidClient.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = response.data;

    // Check if this item is already linked
    const existing = req.user.plaidAccessTokens.find(t => t.itemId === item_id);
    if (!existing) {
      req.user.plaidAccessTokens.push({
        accessToken: access_token,
        itemId: item_id,
        institutionName: institution?.name || 'Unknown',
      });
      await req.user.save();
    }

    res.json({ success: true, item_id });
  } catch (err) {
    console.error('[Plaid] Exchange token error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

// Get transactions for the last 30 days across all linked accounts
router.get('/transactions', async (req, res) => {
  try {
    const tokens = req.user.plaidAccessTokens;
    if (!tokens.length) {
      return res.json({ transactions: [], accounts: [] });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    const allTransactions = [];
    const allAccounts = [];

    for (const token of tokens) {
      try {
        const response = await plaidClient.transactionsGet({
          access_token: token.accessToken,
          start_date: startDate,
          end_date: endDate,
          options: { count: 100, offset: 0 },
        });
        allTransactions.push(...response.data.transactions);
        allAccounts.push(...response.data.accounts);
      } catch (err) {
        console.error(`[Plaid] Transactions error for ${token.institutionName}:`, err.response?.data?.error_message || err.message);
      }
    }

    // Sort by date descending
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ transactions: allTransactions, accounts: allAccounts });
  } catch (err) {
    console.error('[Plaid] Transactions error:', err.message);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get account metadata (balances, types)
router.get('/accounts', async (req, res) => {
  try {
    const tokens = req.user.plaidAccessTokens;
    if (!tokens.length) {
      return res.json({ accounts: [] });
    }

    const allAccounts = [];

    for (const token of tokens) {
      try {
        const response = await plaidClient.accountsGet({
          access_token: token.accessToken,
        });
        allAccounts.push(...response.data.accounts.map(acct => ({
          ...acct,
          institutionName: token.institutionName,
        })));
      } catch (err) {
        console.error(`[Plaid] Accounts error for ${token.institutionName}:`, err.response?.data?.error_message || err.message);
      }
    }

    res.json({ accounts: allAccounts });
  } catch (err) {
    console.error('[Plaid] Accounts error:', err.message);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

export default router;
