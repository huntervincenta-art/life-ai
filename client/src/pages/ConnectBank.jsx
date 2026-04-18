import { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Landmark, CheckCircle, RefreshCw } from 'lucide-react';
import { createLinkToken, exchangePublicToken, getPlaidAccounts } from '../lib/api';

function PlaidLinkButton({ linkToken, onSuccess }) {
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token, metadata) => {
      onSuccess(public_token, metadata.institution);
    },
  });

  return (
    <button className="btn btn-primary" onClick={() => open()} disabled={!ready} style={{ gap: 8 }}>
      <Landmark size={18} />
      Connect a Bank Account
    </button>
  );
}

export default function ConnectBank() {
  const [linkToken, setLinkToken] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const loadAccounts = useCallback(async () => {
    try {
      const data = await getPlaidAccounts();
      setAccounts(data.accounts || []);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [tokenData] = await Promise.all([createLinkToken(), loadAccounts()]);
        setLinkToken(tokenData.link_token);
      } catch (err) {
        setError('Failed to initialize bank connection');
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadAccounts]);

  const handleSuccess = async (publicToken, institution) => {
    setConnecting(true);
    setError('');
    setSuccessMsg('');
    try {
      await exchangePublicToken(publicToken, institution);
      setSuccessMsg(`${institution?.name || 'Bank'} connected successfully!`);
      await loadAccounts();
      // Refresh link token for connecting another bank
      const tokenData = await createLinkToken();
      setLinkToken(tokenData.link_token);
    } catch (err) {
      setError('Failed to link account. Please try again.');
      console.error(err);
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return <div className="page text-center" style={{ paddingTop: 60 }}><span className="spinner" /></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Bank Accounts</h1>
      </div>

      {/* Connect button */}
      <div className="settings-section">
        <div className="settings-section-title">Link a Bank</div>
        {connecting ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="spinner" /> Connecting...
          </div>
        ) : linkToken ? (
          <PlaidLinkButton linkToken={linkToken} onSuccess={handleSuccess} />
        ) : (
          <div className="muted">Unable to initialize Plaid Link</div>
        )}

        {successMsg && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-success)' }}>
            <CheckCircle size={16} /> {successMsg}
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, color: 'var(--accent-danger)' }}>{error}</div>
        )}

        <div className="muted" style={{ marginTop: 12 }}>
          Sandbox mode — use <strong>user_good</strong> / <strong>pass_good</strong> to test
        </div>
      </div>

      {/* Linked accounts */}
      {accounts.length > 0 && (
        <div className="settings-section">
          <div className="settings-section-title">Linked Accounts ({accounts.length})</div>
          {accounts.map(acct => (
            <div key={acct.account_id} className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span className="settings-label">
                  {acct.institutionName ? `${acct.institutionName} — ` : ''}{acct.name}
                </span>
                <span className="settings-value" style={{ color: 'var(--accent-success)' }}>
                  ${acct.balances?.current?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '—'}
                </span>
              </div>
              <span className="muted" style={{ fontSize: 12 }}>
                {acct.type} &middot; {acct.subtype} &middot; ****{acct.mask}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
