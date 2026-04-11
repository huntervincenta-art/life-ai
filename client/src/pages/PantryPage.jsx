import { useState, useEffect, useCallback } from 'react';
import { pantry } from '../utils/api';
import { daysUntil, getExpiryClass, getExpiryLabel, CATEGORY_EMOJI } from '../utils/helpers';

const CATEGORIES = ['all', 'produce', 'dairy', 'meat', 'frozen', 'pantry', 'beverage', 'snack', 'other'];

export default function PantryPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const defaultExpiry = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const [addForm, setAddForm] = useState({ name: '', category: 'other', expiryDate: defaultExpiry, quantity: 1, isFood: true });

  const load = useCallback(async () => {
    try {
      const params = {};
      if (filter !== 'all') params.category = filter;
      setItems(await pantry.list(params));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filter]);

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
      name: addForm.name, category: addForm.category, quantity: Number(addForm.quantity),
      isFood: addForm.isFood, estimatedExpiry: expiry, daysUntilExpiry: daysLeft
    });
    const nd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    setAddForm({ name: '', category: 'other', expiryDate: nd, quantity: 1, isFood: true });
    setShowAdd(false);
    load();
  }

  // Group by category
  const grouped = {};
  for (const item of items) {
    const cat = item.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  if (loading) return <div className="center-msg">Loading...</div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">Pantry</h1>
        <button className="btn btn-sm" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <form style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }} onSubmit={handleAdd}>
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
              <label className="form-label">Expires</label>
              <input className="form-input" type="date" value={addForm.expiryDate} onChange={e => setAddForm(f => ({ ...f, expiryDate: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Qty</label>
              <input className="form-input" type="number" min="1" value={addForm.quantity} onChange={e => setAddForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Food?</label>
              <button type="button" className={`toggle${addForm.isFood ? ' active' : ''}`} onClick={() => setAddForm(f => ({ ...f, isFood: !f.isFood }))} />
            </div>
          </div>
          <button className="btn btn-primary btn-lg" type="submit">Add to Pantry</button>
        </form>
      )}

      {/* Category filter */}
      <div className="chip-group" style={{ marginBottom: 20 }}>
        {CATEGORIES.map(c => (
          <button key={c} className={`chip${filter === c ? ' active' : ''}`} onClick={() => { setFilter(c); setLoading(true); }}>
            {c === 'all' ? 'All' : `${CATEGORY_EMOJI[c] || ''} ${c}`}
          </button>
        ))}
      </div>

      {/* Items by category */}
      {items.length === 0 ? (
        <div className="empty-state">
          <p>No items found.</p>
          <p style={{ color: 'var(--text-muted)' }}>Add items or change your filter.</p>
        </div>
      ) : (
        Object.keys(grouped).sort().map(cat => (
          <div key={cat} className="section">
            <div className="section-label">{CATEGORY_EMOJI[cat] || '📦'} {cat}</div>
            {grouped[cat].map(item => {
              const days = daysUntil(item.estimatedExpiry);
              return (
                <div key={item._id} className="list-item">
                  <div className="list-item-body">
                    <span className="list-item-title">{item.name}</span>
                    {item.quantity > 1 && <span className="list-item-meta" style={{ marginLeft: 6 }}>x{item.quantity}</span>}
                  </div>
                  <span className={`expiry-badge ${getExpiryClass(days)}`}>{getExpiryLabel(days)}</span>
                  <div className="list-item-actions">
                    <button className="btn-sm btn-ghost" onClick={() => handleConsume(item._id)}>Used</button>
                    <button className="btn-sm btn-danger" onClick={() => handleDelete(item._id)}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
