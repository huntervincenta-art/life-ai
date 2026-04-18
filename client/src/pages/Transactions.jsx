import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Landmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPlaidTransactions } from '../lib/api';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const data = await getPlaidTransactions();
        setTransactions(data.transactions || []);
      } catch (err) {
        setError('Failed to load transactions');
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="page text-center" style={{ paddingTop: 60 }}><span className="spinner" /></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Bank Transactions</h1>
        <span className="muted">Last 30 days</span>
      </div>

      {error && <div style={{ color: 'var(--accent-danger)', marginBottom: 12 }}>{error}</div>}

      {transactions.length === 0 ? (
        <div className="settings-section" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Landmark size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <div style={{ marginBottom: 8 }}>No transactions yet</div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/connect-bank')}>
            Connect a Bank
          </button>
        </div>
      ) : (
        <div className="settings-section">
          <div className="settings-section-title">Recent Transactions ({transactions.length})</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 500 }}>Date</th>
                  <th style={{ padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 500 }}>Merchant</th>
                  <th style={{ padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 500, textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 500 }}>Category</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.transaction_id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 6px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {format(new Date(tx.date), 'MMM d')}
                    </td>
                    <td style={{ padding: '10px 6px' }}>
                      {tx.merchant_name || tx.name}
                    </td>
                    <td style={{
                      padding: '10px 6px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: tx.amount > 0 ? 'var(--accent-danger)' : 'var(--accent-success)',
                    }}>
                      {tx.amount > 0 ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 6px', color: 'var(--text-muted)', fontSize: 12 }}>
                      {tx.personal_finance_category?.primary?.replace(/_/g, ' ').toLowerCase() || tx.category?.[0] || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
