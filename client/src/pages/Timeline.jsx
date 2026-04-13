import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Settings } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { getTimeline, getSummary, updateVendor } from '../lib/api';
import EditPanel from '../components/EditPanel';

const CATEGORY_OPTIONS = [
  { value: 'utilities', label: 'Utilities' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'rent', label: 'Rent' },
  { value: 'phone', label: 'Phone' },
  { value: 'internet', label: 'Internet' },
  { value: 'groceries', label: 'Groceries' },
  { value: 'medical', label: 'Medical' },
  { value: 'loan', label: 'Loan' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'other', label: 'Other' },
];

function getDueInfo(nextDate) {
  if (!nextDate) return { label: 'No date', className: 'later' };
  const days = differenceInDays(new Date(nextDate), new Date());
  if (days < 0) return { label: 'OVERDUE', className: 'overdue' };
  if (days === 0) return { label: 'TODAY', className: 'today' };
  if (days === 1) return { label: 'TOMORROW', className: 'tomorrow' };
  if (days <= 3) return { label: `in ${days} days`, className: 'soon' };
  return { label: `in ${days} days`, className: 'later' };
}

function getCardClass(nextDate) {
  if (!nextDate) return '';
  const days = differenceInDays(new Date(nextDate), new Date());
  if (days <= 0) return 'due-urgent';
  if (days <= 3) return 'due-soon';
  return 'due-later';
}

function getConfidenceClass(confidence) {
  if (confidence > 0.7) return 'confidence-high';
  if (confidence > 0.4) return 'confidence-medium';
  return 'confidence-low';
}

export default function Timeline({ refreshKey }) {
  const [vendors, setVendors] = useState([]);
  const [summary, setSummary] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [v, s] = await Promise.all([getTimeline(), getSummary()]);
      setVendors(v);
      setSummary(s);
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleSaveVendor = async (id, data) => {
    try {
      await updateVendor(id, data);
      setExpandedId(null);
      load();
    } catch (err) {
      console.error('Failed to update vendor:', err);
    }
  };

  if (loading) {
    return <div className="page text-center" style={{ paddingTop: 60 }}><span className="spinner" /></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Bills</h1>
      </div>

      {summary && (
        <div className="summary-card">
          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-amount">${summary.next7Days.toFixed(2)}</div>
              <div className="summary-label">Next 7 days</div>
            </div>
            <div className="summary-item">
              <div className="summary-amount">${summary.next30Days.toFixed(2)}</div>
              <div className="summary-label">Next 30 days</div>
            </div>
            <div className="summary-item">
              <div className="summary-stat">{summary.activeVendors}</div>
              <div className="summary-label">Bills tracked</div>
            </div>
            <div className="summary-item">
              <div className="summary-stat">${summary.spentThisMonth.toFixed(2)}</div>
              <div className="summary-label">Spent this month</div>
            </div>
          </div>
        </div>
      )}

      {vendors.length === 0 ? (
        <div className="empty-state">
          <p>No bills detected yet.</p>
          <p>Connect your Gmail in Settings or tap + to add one manually.</p>
          <Link to="/settings" className="btn btn-primary" style={{ marginTop: 16, textDecoration: 'none' }}>
            <Settings size={16} /> Go to Settings
          </Link>
        </div>
      ) : (
        vendors.map(v => {
          const due = getDueInfo(v.nextExpectedDate);
          const isExpanded = expandedId === v._id;
          const amount = v.lastAmount || v.averageAmount;

          return (
            <div key={v._id}>
              <div
                className={`bill-card ${getCardClass(v.nextExpectedDate)}`}
                onClick={() => setExpandedId(isExpanded ? null : v._id)}
              >
                <div className="bill-card-header">
                  <div className="bill-card-left">
                    <div className="bill-vendor">
                      <span className={`confidence-dot ${getConfidenceClass(v.confidence)}`} />
                      {v.name}
                      {v.transactionCount > 0 && v.confidence > 0 && (
                        <span className="badge badge-ai">AI</span>
                      )}
                    </div>
                    <div className="bill-meta">
                      <span className="badge">{v.category}</span>
                      <span className={`bill-due ${due.className}`}>{due.label}</span>
                    </div>
                  </div>
                  <div className="bill-amount">${amount.toFixed(2)}</div>
                </div>

                {isExpanded && (
                  <EditPanel
                    fields={[
                      { key: 'nextExpectedDate', label: 'Next Expected Date', type: 'date' },
                      { key: 'lastAmount', label: 'Expected Amount', type: 'number' },
                      { key: 'category', label: 'Category', type: 'select', options: CATEGORY_OPTIONS },
                      { key: 'billingCycleDays', label: 'Billing Cycle (days)', type: 'number' },
                      { key: 'isActive', label: 'Active', type: 'toggle' },
                    ]}
                    values={{
                      nextExpectedDate: v.nextExpectedDate ? format(new Date(v.nextExpectedDate), 'yyyy-MM-dd') : '',
                      lastAmount: amount,
                      category: v.category,
                      billingCycleDays: v.billingCycleDays,
                      isActive: v.isActive,
                    }}
                    onSave={(data) => {
                      const update = {};
                      if (data.nextExpectedDate) update.nextExpectedDate = data.nextExpectedDate;
                      if (data.category) update.category = data.category;
                      if (data.billingCycleDays) update.billingCycleDays = parseInt(data.billingCycleDays);
                      if (data.isActive !== undefined) update.isActive = data.isActive;
                      handleSaveVendor(v._id, update);
                    }}
                    onCancel={() => setExpandedId(null)}
                  />
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
