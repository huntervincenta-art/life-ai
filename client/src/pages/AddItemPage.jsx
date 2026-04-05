import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addPantryItem } from '../api';

const CATEGORIES = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Frozen',
  'Pantry Staples',
  'Beverages',
  'Snacks',
  'Leftovers',
  'Other',
];

const UNITS = ['count', 'lbs', 'oz', 'kg', 'g', 'bag', 'box', 'can', 'bottle', 'gallon', 'quart', 'pint', 'bunch', 'loaf'];

export default function AddItemPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    category: 'Other',
    quantity: 1,
    unit: 'count',
    estimatedExpiry: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity),
        estimatedExpiry: form.estimatedExpiry || undefined,
      };
      await addPantryItem(payload);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Add Item</h1>
      </div>

      <form className="add-form" onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label">Name *</label>
          <input
            className="field-input"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Chicken breast"
            required
          />
        </div>

        <div className="field">
          <label className="field-label">Category</label>
          <select className="field-input" name="category" value={form.category} onChange={handleChange}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="field-row">
          <div className="field flex-1">
            <label className="field-label">Quantity</label>
            <input
              className="field-input"
              type="number"
              name="quantity"
              min="0"
              step="0.1"
              value={form.quantity}
              onChange={handleChange}
            />
          </div>
          <div className="field flex-1">
            <label className="field-label">Unit</label>
            <select className="field-input" name="unit" value={form.unit} onChange={handleChange}>
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="field-label">Estimated Expiry Date</label>
          <input
            className="field-input"
            type="date"
            name="estimatedExpiry"
            value={form.estimatedExpiry}
            onChange={handleChange}
          />
        </div>

        {error && <p className="error-msg">{error}</p>}

        <button className="btn-primary btn-lg" type="submit" disabled={submitting || !form.name.trim()}>
          {submitting ? 'Adding...' : 'Add to Pantry'}
        </button>
      </form>
    </div>
  );
}
