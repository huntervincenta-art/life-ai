import { useState, useEffect, useCallback } from 'react';
import { pantry } from '../utils/api';
import { daysUntil, getExpiryClass, getExpiryLabel, CATEGORY_EMOJI } from '../utils/helpers';

const CATEGORIES = ['all', 'produce', 'dairy', 'meat', 'frozen', 'pantry', 'beverage', 'snack', 'other'];
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'expiring', label: 'Expiring' },
  { key: 'food', label: 'Food Only' }
];

function ItemCard({ item, onConsume, onDelete }) {
  const days = daysUntil(item.estimatedExpiry);

  return (
    <div className="card slide-up" style={{ padding: '12px 16px' }}>
      <div className="flex-between mb-8">
        <div>
          <span style={{ marginRight: 6 }}>{CATEGORY_EMOJI[item.category] || '📦'}</span>
          <span style={{ fontWeight: 600 }}>{item.name}</span>
          <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>
            x{item.quantity} {item.unit}
          </span>
        </div>
        <span className={`expiry-badge ${getExpiryClass(days)}`}>
          {getExpiryLabel(days)}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-sm btn-ghost" onClick={() => onConsume(item._id)}>Used</button>
        <button className="btn btn-sm btn-danger" onClick={() => onDelete(item._id)}>Remove</button>
      </div>
    </div>
  );
}

export default function PantryPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', category: 'other', daysUntilExpiry: '', quantity: 1, isFood: true });

  const load = useCallback(async () => {
    try {
      const params = {};
      if (filter === 'expiring') params.filter = 'expiring';
      if (filter === 'food') params.filter = 'food';
      if (category !== 'all') params.category = category;

      const [itemsData, statsData] = await Promise.all([
        pantry.list(params),
        pantry.stats()
      ]);
      setItems(itemsData);
      setStats(statsData);
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
    await pantry.add({
      ...addForm,
      quantity: Number(addForm.quantity),
      daysUntilExpiry: addForm.daysUntilExpiry ? Number(addForm.daysUntilExpiry) : undefined
    });
    setAddForm({ name: '', category: 'other', daysUntilExpiry: '', quantity: 1, isFood: true });
    setShowAdd(false);
    load();
  }

  if (loading) return <div className="center-msg">Loading pantry...</div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">Pantry</h1>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--accent-warning)' }}>{stats.expiringSoon}</div>
            <div className="stat-label">Expiring 3d</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--accent-danger)' }}>{stats.expired}</div>
            <div className="stat-label">Expired</div>
          </div>
        </div>
      )}

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
              <label className="form-label">Days until expiry</label>
              <input className="form-input" type="number" min="0" value={addForm.daysUntilExpiry} onChange={e => setAddForm(f => ({ ...f, daysUntilExpiry: e.target.value }))} placeholder="Auto" />
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

      {/* Filter Chips */}
      <div className="chip-group">
        {FILTERS.map(f => (
          <button key={f.key} className={`chip${filter === f.key ? ' active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Category Chips */}
      <div className="chip-group">
        {CATEGORIES.map(c => (
          <button key={c} className={`chip${category === c ? ' active' : ''}`} onClick={() => setCategory(c)}>
            {c === 'all' ? 'All' : `${CATEGORY_EMOJI[c] || ''} ${c}`}
          </button>
        ))}
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">🧊</div>
          <p>No items found</p>
          <p className="muted">Add items or change your filters</p>
        </div>
      ) : (
        items.map(item => (
          <ItemCard key={item._id} item={item} onConsume={handleConsume} onDelete={handleDelete} />
        ))
      )}
    </div>
  );
}
