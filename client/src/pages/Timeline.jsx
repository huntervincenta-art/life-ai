import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, ExternalLink, X, Search, RefreshCw, ChevronDown, ChevronUp, MessageCircle, CreditCard, Phone } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { getTimeline, getSummary, updateVendor, lookupVendorActions, lookupVendorPayment, getActiveChat, getProgress, getSettings } from '../lib/api';
import EditPanel from '../components/EditPanel';
import InstallBanner from '../components/InstallBanner';
import ScorpioGreeting from '../components/ScorpioGreeting';
import ProgressHeader from '../components/ProgressHeader';
import BadgeDrawer from '../components/BadgeDrawer';
import NewBadgeToast from '../components/NewBadgeToast';

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

const UNPREDICTABLE_PATTERNS = ['irregular', 'one_time', 'unknown'];

function isConfidentVendor(v) {
  return v.confidence >= 0.5 && !UNPREDICTABLE_PATTERNS.includes(v.billingPattern);
}

function getDueInfo(nextDate, vendor) {
  // Only show overdue/urgent for vendors with confident predictions
  if (!vendor || !isConfidentVendor(vendor)) {
    return { label: '', className: 'later', days: 999, isUrgent: false };
  }
  if (!nextDate) return { label: 'No date', className: 'later', days: 999, isUrgent: false };
  const days = differenceInDays(new Date(nextDate), new Date());
  if (days < 0) return { label: 'OVERDUE', className: 'overdue', days, isUrgent: true };
  if (days === 0) return { label: 'DUE TODAY', className: 'today', days, isUrgent: true };
  if (days === 1) return { label: 'DUE TOMORROW', className: 'tomorrow', days, isUrgent: true };
  if (days <= 3) return { label: `in ${days} days`, className: 'soon', days, isUrgent: true };
  return { label: `in ${days} days`, className: 'later', days, isUrgent: false };
}

function getCardClass(nextDate, vendor) {
  if (!vendor || !isConfidentVendor(vendor)) return '';
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

function DifficultyBadge({ difficulty, type }) {
  if (!difficulty) return null;
  const cls = type === 'pay' ? `difficulty-badge difficulty-${difficulty}` : `difficulty-badge difficulty-${difficulty}`;
  return <span className={cls}>{difficulty}</span>;
}

// Prominent Pay button for the card header row — used on urgent bills
function HeaderPayButton({ vendor, onLookupPay, lookingUp, onExpand }) {
  const url = vendor.payUrl || vendor.accountUrl || vendor.manageUrl || vendor.loginUrl;
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="header-pay-btn" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
        <CreditCard size={12} /> Pay
      </a>
    );
  }
  return (
    <button className="header-pay-btn header-pay-btn-lookup" disabled={lookingUp}
      onClick={e => { e.stopPropagation(); onLookupPay(); }}
      onMouseDown={e => e.stopPropagation()}>
      {lookingUp ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <CreditCard size={12} />}
      {lookingUp ? '...' : 'Pay'}
    </button>
  );
}

// Action buttons row — shows pay + cancel actions
function ActionButtons({ vendor, due, onLookupCancel, lookingUpCancel, onLookupPay, lookingUpPay }) {
  const [showCancel, setShowCancel] = useState(false);
  const hasCancelMethod = vendor.cancelMethod;

  return (
    <div className="bill-actions" onClick={e => e.stopPropagation()}>
      {/* Pay button — always shown for urgent, shown as subtle for others */}
      {due.isUrgent ? (
        <PayButton vendor={vendor} onLookupPay={onLookupPay} lookingUp={lookingUpPay} />
      ) : (vendor.payUrl || vendor.accountUrl || vendor.manageUrl || vendor.loginUrl) ? (
        <a href={vendor.payUrl || vendor.accountUrl || vendor.manageUrl || vendor.loginUrl}
          target="_blank" rel="noopener noreferrer" className="action-btn action-btn-pay">
          <CreditCard size={10} /> Pay
        </a>
      ) : null}

      {/* Cancel button */}
      {vendor.cancelUrl && (
        <a href={vendor.cancelUrl} target="_blank" rel="noopener noreferrer"
          className="action-btn action-btn-cancel">
          <X size={10} /> Cancel
        </a>
      )}

      {/* How to cancel expand */}
      {hasCancelMethod && (
        <>
          <button className="cancel-expand-btn" onClick={() => setShowCancel(!showCancel)}>
            How to cancel {showCancel ? <ChevronUp size={10} style={{ verticalAlign: 'middle' }} /> : <ChevronDown size={10} style={{ verticalAlign: 'middle' }} />}
          </button>
          <DifficultyBadge difficulty={vendor.cancelDifficulty} />
        </>
      )}

      {/* No info at all — show lookup */}
      {!vendor.payUrl && !vendor.accountUrl && !vendor.manageUrl && !vendor.loginUrl && !vendor.cancelUrl && !hasCancelMethod && !due.isUrgent && (
        <button className="action-btn action-btn-lookup" disabled={lookingUpCancel}
          onClick={() => onLookupCancel()}>
          {lookingUpCancel ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Search size={10} />}
          {lookingUpCancel ? 'Looking up...' : 'Find info'}
        </button>
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

// Urgent pay bar — shows below header for overdue/due-soon bills
function UrgentPayBar({ vendor, due, onLookupPay, lookingUpPay }) {
  if (!due.isUrgent) return null;

  return (
    <div className="bill-pay-bar" onClick={e => e.stopPropagation()}>
      {vendor.payMethod ? (
        <span className="pay-method">{vendor.payMethod}</span>
      ) : (
        <span className="pay-method" style={{ color: 'var(--text-muted)' }}>
          {due.days < 0 ? 'Tap Pay Now to handle this' : 'Pay before it\'s due'}
        </span>
      )}
      {vendor.supportPhone && (
        <a href={`tel:${vendor.supportPhone}`} className="phone-link" onClick={e => e.stopPropagation()}>
          <Phone size={10} /> {vendor.supportPhone}
        </a>
      )}
    </div>
  );
}

// Payment info section in expanded panel
function PaySection({ vendor, onRefresh, refreshing }) {
  return (
    <div className="pay-section">
      <div className="pay-section-title">How to pay</div>

      {vendor.payMethod ? (
        <>
          <div className="pay-method">{vendor.payMethod}</div>
          <DifficultyBadge difficulty={vendor.payDifficulty} type="pay" />
          {vendor.payTip && <div className="pay-tip" style={{ marginTop: 8 }}>{vendor.payTip}</div>}
        </>
      ) : (
        <div className="muted" style={{ marginBottom: 8 }}>No payment info yet.</div>
      )}

      <div className="pay-links">
        {vendor.payUrl && (
          <a href={vendor.payUrl} target="_blank" rel="noopener noreferrer" className="action-btn action-btn-pay-primary">
            <CreditCard size={10} /> Pay Now
          </a>
        )}
        {vendor.accountUrl && (
          <a href={vendor.accountUrl} target="_blank" rel="noopener noreferrer" className="action-btn action-btn-pay">
            <ExternalLink size={10} /> Account
          </a>
        )}
        {vendor.supportUrl && (
          <a href={vendor.supportUrl} target="_blank" rel="noopener noreferrer" className="action-btn">
            <ExternalLink size={10} /> Support
          </a>
        )}
        {vendor.supportPhone && (
          <a href={`tel:${vendor.supportPhone}`} className="phone-link">
            <Phone size={10} /> {vendor.supportPhone}
          </a>
        )}
      </div>

      <button className="action-btn action-btn-lookup" onClick={onRefresh} disabled={refreshing} style={{ marginTop: 4 }}>
        {refreshing ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <RefreshCw size={10} />}
        Refresh payment info
      </button>
    </div>
  );
}

function CancelSection({ vendor, onRefresh, refreshing, onMarkCancelled }) {
  const [cancelled, setCancelled] = useState(false);

  return (
    <div className="cancel-section">
      <div className="cancel-section-title">How to cancel</div>

      {vendor.cancelMethod ? (
        <>
          <div className="cancel-method">{vendor.cancelMethod}</div>
          <DifficultyBadge difficulty={vendor.cancelDifficulty} />
          {vendor.cancelTip && <div className="cancel-tip" style={{ marginTop: 8 }}>{vendor.cancelTip}</div>}
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

      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
        <button className="action-btn action-btn-lookup" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <RefreshCw size={10} />}
          Refresh cancel info
        </button>
        {!cancelled ? (
          <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={() => { onMarkCancelled(); setCancelled(true); }}>
            Mark as Cancelled
          </button>
        ) : (
          <span className="cancel-confirm-msg">Marked as cancelled. We'll let you know if we detect another charge.</span>
        )}
      </div>
    </div>
  );
}

// Collapsible section for tracked (unpredicted) purchases
function TrackedSection({ vendors, renderCard }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ marginTop: 16 }}>
      <div
        className="tracked-section-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span>Tracked purchases ({vendors.length})</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>
      {expanded && vendors.map(v => renderCard(v))}
    </div>
  );
}

// Inline promote-to-recurring toggle for tracked purchases
function PromoteToRecurring({ vendor, onSave }) {
  const [cycle, setCycle] = useState(30);
  const [nextDate, setNextDate] = useState('');

  const handlePromote = () => {
    const update = {
      billingPattern: cycle <= 8 ? 'weekly' : cycle <= 35 ? 'monthly' : cycle <= 100 ? 'quarterly' : 'annual',
      confidence: 0.8,
      billingCycleDays: parseInt(cycle),
    };
    if (nextDate) update.nextExpectedDate = nextDate;
    else {
      const d = new Date(vendor.lastPaidDate || Date.now());
      d.setDate(d.getDate() + parseInt(cycle));
      update.nextExpectedDate = d.toISOString().split('T')[0];
    }
    onSave(update);
  };

  return (
    <div className="promote-section">
      <div className="promote-label">This is a recurring bill?</div>
      <div className="form-row" style={{ marginBottom: 8 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Cycle (days)</label>
          <input className="form-input" type="number" value={cycle}
            onChange={e => setCycle(e.target.value)}
            onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Next due date</label>
          <input className="form-input" type="date" value={nextDate}
            onChange={e => setNextDate(e.target.value)}
            onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} />
        </div>
      </div>
      <button className="btn btn-primary btn-sm" onClick={handlePromote} style={{ gap: 4 }}>
        Mark as recurring bill
      </button>
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
  const [lookingUpPay, setLookingUpPay] = useState({});
  const [refreshingCancel, setRefreshingCancel] = useState({});
  const [refreshingPay, setRefreshingPay] = useState({});
  const [hasActiveChat, setHasActiveChat] = useState(false);
  const [progress, setProgress] = useState(null);
  const [lastOpenedAt, setLastOpenedAt] = useState(null);
  const [showBadges, setShowBadges] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      const [v, s, activeChat, prog, settings] = await Promise.all([getTimeline(), getSummary(), getActiveChat(), getProgress(), getSettings()]);
      setVendors(v);
      setSummary(s);
      setHasActiveChat(!!activeChat);
      setProgress(prog);
      setLastOpenedAt(settings.lastOpenedAt);
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

  const doLookup = async (vendorId, lookupFn, setLoading) => {
    setLoading(prev => ({ ...prev, [vendorId]: true }));
    try {
      const updated = await lookupFn(vendorId);
      setVendors(prev => prev.map(v => v._id === vendorId ? updated : v));
    } catch (err) {
      console.error('Lookup failed:', err);
    } finally {
      setLoading(prev => ({ ...prev, [vendorId]: false }));
    }
  };

  const handleMarkCancelled = async (vendorId) => {
    try {
      await updateVendor(vendorId, { isActive: false });
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

      <ScorpioGreeting lastOpenedAt={lastOpenedAt} />

      <InstallBanner />

      <ProgressHeader progress={progress} onOpenBadges={() => setShowBadges(true)} />

      {toast && (
        <NewBadgeToast
          badge={toast.badge}
          levelUp={toast.levelUp}
          onDismiss={() => setToast(null)}
          onTap={() => { setToast(null); setShowBadges(true); }}
        />
      )}

      {showBadges && <BadgeDrawer progress={progress} onClose={() => setShowBadges(false)} />}

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
            <MessageCircle size={16} /> {hasActiveChat ? 'Continue Chat' : 'Chat with Scorpio'}
          </button>
        </div>
      )}

      {(() => {
        const predictedVendors = vendors.filter(v => isConfidentVendor(v));
        const trackedVendors = vendors.filter(v => !isConfidentVendor(v));
        const noVendors = vendors.length === 0;

        const renderBillCard = (v, isTracked = false) => {
          const due = isTracked ? { label: '', className: 'later', days: 999, isUrgent: false } : getDueInfo(v.nextExpectedDate, v);
          const isExpanded = expandedId === v._id;
          const amount = v.lastAmount || v.averageAmount;

          return (
            <div key={v._id}>
              <div className={`bill-card ${isTracked ? '' : getCardClass(v.nextExpectedDate, v)}`}>
                <div
                  className="bill-card-header"
                  onClick={() => setExpandedId(isExpanded ? null : v._id)}
                  style={{ cursor: 'pointer' }}
                >
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
                      {isTracked ? (
                        <span className="muted" style={{ fontSize: 11 }}>
                          Last paid: {v.lastPaidDate ? format(new Date(v.lastPaidDate), 'MMM d') : '—'}
                        </span>
                      ) : (
                        due.label && <span className={`bill-due ${due.className}`}>{due.label}</span>
                      )}
                    </div>
                  </div>
                  <div className="bill-amount">${amount.toFixed(2)}</div>
                  {!isTracked && due.isUrgent && (
                    <HeaderPayButton
                      vendor={v}
                      onLookupPay={() => doLookup(v._id, lookupVendorPayment, setLookingUpPay)}
                      lookingUp={!!lookingUpPay[v._id]}
                      onExpand={() => setExpandedId(v._id)}
                    />
                  )}
                </div>

                {!isTracked && due.isUrgent && (
                  <UrgentPayBar vendor={v} due={due}
                    onLookupPay={() => doLookup(v._id, lookupVendorPayment, setLookingUpPay)}
                    lookingUpPay={!!lookingUpPay[v._id]} />
                )}

                {!isTracked && !due.isUrgent && (
                  <ActionButtons vendor={v} due={due}
                    onLookupCancel={() => doLookup(v._id, lookupVendorActions, setLookingUp)}
                    lookingUpCancel={!!lookingUp[v._id]}
                    onLookupPay={() => doLookup(v._id, lookupVendorPayment, setLookingUpPay)}
                    lookingUpPay={!!lookingUpPay[v._id]} />
                )}

                {isExpanded && (
                  <div onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
                    {isTracked && (
                      <PromoteToRecurring vendor={v} onSave={(data) => handleSaveVendor(v._id, data)} />
                    )}

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
                        billingCycleDays: v.billingCycleDays || 30,
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

                    <PaySection vendor={v}
                      onRefresh={() => doLookup(v._id, lookupVendorPayment, setRefreshingPay)}
                      refreshing={!!refreshingPay[v._id]} />

                    <CancelSection vendor={v}
                      onRefresh={() => doLookup(v._id, lookupVendorActions, setRefreshingCancel)}
                      refreshing={!!refreshingCancel[v._id]}
                      onMarkCancelled={() => handleMarkCancelled(v._id)} />
                  </div>
                )}
              </div>
            </div>
          );
        };

        return (
          <>
            {noVendors ? (
              <div className="empty-state">
                <p>No bills detected yet.</p>
                <p>Connect your Gmail in Settings or tap + to add one manually.</p>
                <Link to="/settings" className="btn btn-primary" style={{ marginTop: 16, textDecoration: 'none' }}>
                  <Settings size={16} /> Go to Settings
                </Link>
              </div>
            ) : (
              <>
                {/* Upcoming bills — confident predictions */}
                {predictedVendors.length > 0 && predictedVendors.map(v => renderBillCard(v, false))}

                {predictedVendors.length === 0 && trackedVendors.length > 0 && (
                  <div className="muted text-center" style={{ padding: '16px 0' }}>
                    No predicted upcoming bills yet. Bills will appear here as patterns are detected.
                  </div>
                )}

                {/* Tracked purchases — no predictions */}
                {trackedVendors.length > 0 && (
                  <TrackedSection
                    vendors={trackedVendors}
                    renderCard={(v) => renderBillCard(v, true)}
                  />
                )}
              </>
            )}
          </>
        );
      })()}
    </div>
  );
}
