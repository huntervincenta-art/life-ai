import { useState } from 'react';
import { X } from 'lucide-react';
import { addBill } from '../lib/api';

const CATEGORIES = [
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

const CYCLE_OPTIONS = [
  { value: 30, label: 'Monthly' },
  { value: 90, label: 'Quarterly' },
  { value: 365, label: 'Annually' },
  { value: 'custom', label: 'Custom' },
];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function AddBillModal({ onClose, onAdded }) {
  const [form, setForm] = useState({
    vendor: '',
    amount: '',
    datePaid: todayStr(),
    category: 'other',
    isRecurring: false,
    cyclePreset: 30,
    customDays: 30,
    nextExpectedDate: '',
    paymentMethod: '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (key, value) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      // Auto-calculate next expected date when relevant fields change
      if (['datePaid', 'cyclePreset', 'customDays', 'isRecurring'].includes(key)) {
        if (next.isRecurring && next.datePaid) {
          const days = next.cyclePreset === 'custom' ? next.customDays : next.cyclePreset;
          const d = new Date(next.datePaid);
          d.setDate(d.getDate() + parseInt(days) || 30);
          next.nextExpectedDate = d.toISOString().split('T')[0];
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vendor || !form.amount) return;

    setSaving(true);
    try {
      const billingCycleDays = form.isRecurring
        ? (form.cyclePreset === 'custom' ? parseInt(form.customDays) : parseInt(form.cyclePreset))
        : undefined;

      await addBill({
        vendor: form.vendor,
        amount: parseFloat(form.amount),
        datePaid: form.datePaid,
        category: form.category,
        isRecurring: form.isRecurring,
        billingCycleDays,
        nextExpectedDate: form.isRecurring ? form.nextExpectedDate : undefined,
        paymentMethod: form.paymentMethod,
      });

      onAdded();
      onClose();
    } catch (err) {
      console.error('Failed to add bill:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Bill</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Vendor Name *</label>
            <input
              className="form-input"
              type="text"
              value={form.vendor}
              onChange={e => handleChange('vendor', e.target.value)}
              placeholder="e.g. Netflix"
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount *</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                value={form.amount}
                onChange={e => handleChange('amount', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date Paid</label>
              <input
                className="form-input"
                type="date"
                value={form.datePaid}
                onChange={e => handleChange('datePaid', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={form.category}
              onChange={e => handleChange('category', e.target.value)}
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="form-toggle-row">
            <span className="form-label" style={{ marginBottom: 0 }}>Recurring?</span>
            <button
              type="button"
              className={`toggle ${form.isRecurring ? 'active' : ''}`}
              onClick={() => handleChange('isRecurring', !form.isRecurring)}
            />
          </div>

          {form.isRecurring && (
            <>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Billing Cycle</label>
                <select
                  className="form-select"
                  value={form.cyclePreset}
                  onChange={e => handleChange('cyclePreset', e.target.value === 'custom' ? 'custom' : parseInt(e.target.value))}
                >
                  {CYCLE_OPTIONS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {form.cyclePreset === 'custom' && (
                <div className="form-group">
                  <label className="form-label">Custom Days</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.customDays}
                    onChange={e => handleChange('customDays', e.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Next Expected Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.nextExpectedDate}
                  onChange={e => handleChange('nextExpectedDate', e.target.value)}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Payment Method (optional)</label>
            <input
              className="form-input"
              type="text"
              value={form.paymentMethod}
              onChange={e => handleChange('paymentMethod', e.target.value)}
              placeholder="Last 4 digits"
              maxLength={4}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={saving || !form.vendor || !form.amount}
            style={{ marginTop: 8 }}
          >
            {saving ? <span className="spinner" /> : 'Add Bill'}
          </button>
        </form>
      </div>
    </div>
  );
}
