import { useState, useEffect, useCallback } from 'react';
import { Mail, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { getHistory, updateTransaction, deleteTransaction } from '../lib/api';
import EditPanel from '../components/EditPanel';

const CATEGORIES = [
  'all', 'utilities', 'subscriptions', 'insurance', 'rent', 'phone',
  'internet', 'groceries', 'medical', 'loan', 'credit_card', 'other'
];

const CATEGORY_OPTIONS = CATEGORIES.filter(c => c !== 'all').map(c => ({
  value: c, label: c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
}));

function groupByMonth(transactions) {
  const groups = {};
  for (const tx of transactions) {
    const key = format(new Date(tx.datePaid), 'yyyy-MM');
    if (!groups[key]) groups[key] = { label: format(new Date(tx.datePaid), 'MMMM yyyy'), transactions: [], total: 0 };
    groups[key].transactions.push(tx);
    groups[key].total += tx.amount;
  }
  return Object.values(groups);
}

export default function History() {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const params = {};
      if (filter !== 'all') params.category = filter;
      const data = await getHistory(params);
      setTransactions(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = async (id, data) => {
    try {
      await updateTransaction(id, data);
      setExpandedId(null);
      load();
    } catch (err) {
      console.error('Failed to update transaction:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTransaction(id);
      setExpandedId(null);
      load();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  const months = groupByMonth(transactions);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">History</h1>
      </div>

      <div className="filter-pills">
        {CATEGORIES.map(c => (
          <button
            key={c}
            className={`filter-pill ${filter === c ? 'active' : ''}`}
            onClick={() => setFilter(c)}
          >
            {c === 'all' ? 'All' : c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center" style={{ padding: 40 }}><span className="spinner" /></div>
      ) : transactions.length === 0 ? (
        <div className="empty-state">
          <p>No transactions found.</p>
        </div>
      ) : (
        months.map(group => (
          <div key={group.label} className="month-group">
            <div className="month-header">
              <span className="month-title">{group.label}</span>
              <span className="month-total">${group.total.toFixed(2)}</span>
            </div>

            {group.transactions.map(tx => {
              const isExpanded = expandedId === tx._id;
              return (
                <div key={tx._id}>
                  <div
                    className="tx-row"
                    onClick={() => setExpandedId(isExpanded ? null : tx._id)}
                  >
                    <span className="tx-source-icon">
                      {tx.source === 'email_scan' ? <Mail size={14} /> : <Pencil size={14} />}
                    </span>
                    <div className="tx-body">
                      <div className="tx-vendor">
                        {tx.vendor}
                        <span className="badge" style={{ marginLeft: 6 }}>{tx.category}</span>
                      </div>
                      <div className="tx-date">{format(new Date(tx.datePaid), 'MMM d, yyyy')}</div>
                    </div>
                    <div className="tx-right">
                      <div className="tx-amount">${tx.amount.toFixed(2)}</div>
                    </div>
                  </div>

                  {isExpanded && (
                    <EditPanel
                      fields={[
                        { key: 'vendor', label: 'Vendor', type: 'text' },
                        { key: 'amount', label: 'Amount', type: 'number' },
                        { key: 'datePaid', label: 'Date Paid', type: 'date' },
                        { key: 'category', label: 'Category', type: 'select', options: CATEGORY_OPTIONS },
                        { key: 'isRecurring', label: 'Recurring', type: 'toggle' },
                      ]}
                      values={{
                        vendor: tx.vendor,
                        amount: tx.amount,
                        datePaid: format(new Date(tx.datePaid), 'yyyy-MM-dd'),
                        category: tx.category,
                        isRecurring: tx.isRecurring,
                      }}
                      onSave={(data) => handleUpdate(tx._id, {
                        vendor: data.vendor,
                        amount: parseFloat(data.amount),
                        datePaid: data.datePaid,
                        category: data.category,
                        isRecurring: data.isRecurring,
                      })}
                      onDelete={() => handleDelete(tx._id)}
                      onCancel={() => setExpandedId(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
