import { useState, useEffect, useCallback } from 'react';
import { pantry } from '../utils/api';
import { daysUntil, getExpiryClass, getExpiryLabel, CATEGORY_EMOJI } from '../utils/helpers';

const CATEGORIES = ['all', 'produce', 'dairy', 'meat', 'frozen', 'pantry', 'beverage', 'snack', 'other'];
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'expiring', label: 'Expiring' },
  { key: 'food', label: 'Food only' }
];

export default function PantryPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const defaultExpiry = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const [addForm, setAddForm] = useState({ name: '', category: 'other', expiryDate: defaultExpiry, quantity: 1, isFood: true });

  const load = useCallback(async () => {
    try {
      const params = {};
      if (filter === 'expiring') params.filter = 'expiring';
      if (filter === 'food') params.filter = 'food';
      if (category !== 'all') params.category = category;
      const data = await pantry.list(params);
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter, category]);

  useEffect(() => { load(); }, [load]);

  async function handleConsume(id) {
    await pantry.consume(id);
    setItems(prev => prev.filter(i => i._id !== id));
  }

  async function handleDelete(id) {
    await pantry.remove(id);
    setItems(prev => prev.filter(i => i._id !== id));
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!addForm.name.trim()) return;
    const expiry = addForm.expiryDate ? new Date(addForm.expiryDate + 'T23:59:59') : null;
    const daysLeft = expiry ? Math.ceil((expiry - new Date()) / 86400000) : undefined;
    await pantry.add({
      name: addForm.name,
      category: addForm.category,
      quantity: Number(addForm.quantity),
      isFood: addForm.isFood,
      estimatedExpiry: expiry,
      daysUntilExpiry: daysLeft
    });
    const newDefault = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    setAddForm({ name: '', category: 'other', expiryDate: newDefault, quantity: 1, isFood: true });
    setShowAdd(false);
    load();
  }

  // Group items by category
  const grouped = {};
  for (const item of items) {
    const cat = item.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }
  const sortedCategories = Object.keys(grouped).sort();

  if (loading) return <div className="center-msg">Loading pantry...</div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">Pantry</h1>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <form className="card mb-16" onSubmit={handleAdd}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Bananas" required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.filter(c => c !== 'all').map(c => <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Expiration Date</label>
              <input className="form-input" type="date" value={addForm.expiryDate} onChange={e => setAddForm(f => ({ ...f, expiryDate: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input className="form-input" type="number" min="1" value={addForm.quantity} onChange={e => setAddForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Food item?</label>
              <button type="button" className={`toggle${addForm.isFood ? ' active' : ''}`} onClick={() => setAddForm(f => ({ ...f, isFood: !f.isFood }))} />
            </div>
          </div>
          <button className="btn btn-primary btn-lg" type="submit">Add to Pantry</button>
        </form>
      )}

      {/* Filters */}
      <div className="chip-group">
        {FILTERS.map(f => (
          <button key={f.key} className={`chip${filter === f.key ? ' active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="chip-group">
        {CATEGORIES.map(c => (
          <button key={c} className={`chip${category === c ? ' active' : ''}`} onClick={() => setCategory(c)}>
            {c === 'all' ? 'All' : `${CATEGORY_EMOJI[c] || ''} ${c}`}
          </button>
        ))}
      </div>

      {/* Items grouped by category */}
      {items.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">🧊</div>
          <p>No items found</p>
          <p className="muted">Add items or change your filters</p>
        </div>
      ) : (
        sortedCategories.map(cat => (
          <div key={cat} className="category-group">
            <div className="category-group-header">
              {CATEGORY_EMOJI[cat] || '📦'} {cat}
            </div>
            <div className="category-group-items">
              {grouped[cat].map(item => {
                const days = daysUntil(item.estimatedExpiry);
                return (
                  <div key={item._id} className="pantry-item">
                    <div className="pantry-item-info">
                      <div className="pantry-item-name">{item.name}</div>
                      <div className="pantry-item-meta">x{item.quantity} {item.unit}</div>
                    </div>
                    <span className={`expiry-badge ${getExpiryClass(days)}`}>
                      {getExpiryLabel(days)}
                    </span>
                    <div className="pantry-item-actions">
                      <button className="btn-sm btn-ghost" onClick={() => handleConsume(item._id)}>Used</button>
                      <button className="btn-sm btn-danger" onClick={() => handleDelete(item._id)}>x</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
