import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, ExternalLink, X, Search, RefreshCw, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { getTimeline, getSummary, updateVendor, lookupVendorActions, getActiveChat } from '../lib/api';
import EditPanel from '../components/EditPanel';
import InstallBanner from '../components/InstallBanner';

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

function DifficultyBadge({ difficulty }) {
  if (!difficulty) return null;
  return <span className={`difficulty-badge difficulty-${difficulty}`}>{difficulty}</span>;
}

function ActionButtons({ vendor, onLookup, lookingUp }) {
  const hasManageUrl = vendor.manageUrl || vendor.loginUrl;
  const hasCancelUrl = vendor.cancelUrl;
  const hasCancelMethod = vendor.cancelMethod;
  const hasAnyInfo = hasManageUrl || hasCancelUrl || hasCancelMethod;
  const [showCancel, setShowCancel] = useState(false);

  if (!hasAnyInfo) {
    return (
      <div className="bill-actions">
        <button
          className="action-btn action-btn-lookup"
          onClick={(e) => { e.stopPropagation(); onLookup(); }}
          disabled={lookingUp}
        >
          {lookingUp ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Search size={10} />}
          {lookingUp ? 'Looking up...' : 'Find cancel info'}
        </button>
      </div>
    );
  }

  return (
    <div className="bill-actions" onClick={e => e.stopPropagation()}>
      {hasManageUrl && (
        <a
          href={vendor.manageUrl || vendor.loginUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="action-btn"
        >
          <ExternalLink size={10} /> Pay / Manage
        </a>
      )}
      {hasCancelUrl && (
        <a
          href={vendor.cancelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="action-btn action-btn-cancel"
        >
          <X size={10} /> Cancel
        </a>
      )}
      {hasCancelMethod && (
        <>
          <button
            className="cancel-expand-btn"
            onClick={() => setShowCancel(!showCancel)}
          >
            How to cancel {showCancel ? <ChevronUp size={10} style={{ verticalAlign: 'middle' }} /> : <ChevronDown size={10} style={{ verticalAlign: 'middle' }} />}
          </button>
          <DifficultyBadge difficulty={vendor.cancelDifficulty} />
        </>
      )}
      {showCancel && hasCancelMethod && (
        <div className="cancel-inline" style={{ width: '100%' }}>
          <div className="cancel-method">{vendor.cancelMethod}</div>
          {vendor.cancelTip && <div className="cancel-tip">{vendor.cancelTip}</div>}
        </div>
      )}
    </div>
  );
}

function CancelSection({ vendor, onRefresh, refreshing, onMarkCancelled }) {
  const [cancelled, setCancelled] = useState(false);

  return (
    <div className="cancel-section">
      <div className="cancel-section-title">Cancel this subscription</div>

      {vendor.cancelMethod ? (
        <>
          <div className="cancel-method">{vendor.cancelMethod}</div>
          <DifficultyBadge difficulty={vendor.cancelDifficulty} />
          {vendor.cancelTip && (
            <div className="cancel-tip" style={{ marginTop: 8 }}>{vendor.cancelTip}</div>
          )}
        </>
      ) : (
        <div className="muted" style={{ marginBottom: 8 }}>No cancel info yet.</div>
      )}

      <div className="cancel-links">
        {vendor.cancelUrl && (
          <a href={vendor.cancelUrl} target="_blank" rel="noopener noreferrer" className="action-btn action-btn-cancel">
            <X size={10} /> Cancel Page
          </a>
        )}
        {vendor.manageUrl && (
          <a href={vendor.manageUrl} target="_blank" rel="noopener noreferrer" className="action-btn">
            <ExternalLink size={10} /> Manage Account
          </a>
        )}
        {vendor.loginUrl && (
          <a href={vendor.loginUrl} target="_blank" rel="noopener noreferrer" className="action-btn">
            <ExternalLink size={10} /> Log In
          </a>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          className="action-btn action-btn-lookup"
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <RefreshCw size={10} />}
          Refresh cancel info
        </button>
        {!cancelled ? (
          <button
            className="btn btn-danger"
            style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={() => { onMarkCancelled(); setCancelled(true); }}
          >
            Mark as Cancelled
          </button>
        ) : (
          <span className="cancel-confirm-msg">Marked as cancelled. We'll let you know if we detect another charge.</span>
        )}
      </div>
    </div>
  );
}

export default function Timeline({ refreshKey }) {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [summary, setSummary] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lookingUp, setLookingUp] = useState({});
  const [refreshingCancel, setRefreshingCancel] = useState({});
  const [hasActiveChat, setHasActiveChat] = useState(false);

  const load = useCallback(async () => {
    try {
      const [v, s, activeChat] = await Promise.all([getTimeline(), getSummary(), getActiveChat()]);
      setVendors(v);
      setSummary(s);
      setHasActiveChat(!!activeChat);
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

  const handleLookup = async (vendorId) => {
    setLookingUp(prev => ({ ...prev, [vendorId]: true }));
    try {
      const updated = await lookupVendorActions(vendorId);
      setVendors(prev => prev.map(v => v._id === vendorId ? updated : v));
    } catch (err) {
      console.error('Lookup failed:', err);
    } finally {
      setLookingUp(prev => ({ ...prev, [vendorId]: false }));
    }
  };

  const handleRefreshCancel = async (vendorId) => {
    setRefreshingCancel(prev => ({ ...prev, [vendorId]: true }));
    try {
      const updated = await lookupVendorActions(vendorId);
      setVendors(prev => prev.map(v => v._id === vendorId ? updated : v));
    } catch (err) {
      console.error('Refresh cancel failed:', err);
    } finally {
      setRefreshingCancel(prev => ({ ...prev, [vendorId]: false }));
    }
  };

  const handleMarkCancelled = async (vendorId) => {
    try {
      await updateVendor(vendorId, { isActive: false });
      // Remove from list after brief delay so user sees the confirmation
      setTimeout(() => {
        setVendors(prev => prev.filter(v => v._id !== vendorId));
        setExpandedId(null);
        load();
      }, 2000);
    } catch (err) {
      console.error('Failed to mark cancelled:', err);
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

      <InstallBanner />

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

      {/* Chat CTA */}
      {vendors.length < 5 && (
        <div className={`chat-cta ${vendors.length > 0 ? 'chat-cta-small' : ''}`}>
          <h3>{hasActiveChat ? 'Continue mapping your bills' : vendors.length === 0 ? 'Map out your bills in 20 minutes' : 'Want to add more bills? Chat again'}</h3>
          <p>{vendors.length === 0 ? "Have a quick chat and we'll build your bill timeline together" : 'Pick up where you left off or start a new round'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/chat')} style={{ gap: 6 }}>
            <MessageCircle size={16} /> {hasActiveChat ? 'Continue Chat' : 'Start Chat'}
          </button>
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

                <ActionButtons
                  vendor={v}
                  onLookup={() => handleLookup(v._id)}
                  lookingUp={!!lookingUp[v._id]}
                />

                {isExpanded && (
                  <>
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

                    <CancelSection
                      vendor={v}
                      onRefresh={() => handleRefreshCancel(v._id)}
                      refreshing={!!refreshingCancel[v._id]}
                      onMarkCancelled={() => handleMarkCancelled(v._id)}
                    />
                  </>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
