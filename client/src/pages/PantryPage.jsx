import { useState, useEffect, useCallback } from 'react';
import { getPantryItems, deletePantryItem, updatePantryItem } from '../api';
import { getDaysUntilExpiry, expiryPillClass, expiryLabel } from '../utils';

function ItemCard({ item, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(item.quantity);
  const days = getDaysUntilExpiry(item.estimatedExpiry);
  const pillClass = expiryPillClass(days);

  async function handleDelete() {
    if (confirm(`Mark "${item.name}" as used and remove it?`)) {
      await onDelete(item._id);
    }
  }

  async function saveQty() {
    await onUpdate(item._id, { quantity: Number(qty) });
    setEditing(false);
  }

  return (
    <div className="item-card">
      <div className="item-card-top">
        <div>
          <p className="item-name">{item.name}</p>
          <span className="category-badge">{item.category}</span>
        </div>
        <span className={`pill ${pillClass}`}>{expiryLabel(days)}</span>
      </div>
      <div className="item-card-bottom">
        {editing ? (
          <div className="qty-row">
            <input
              type="number"
              min="0"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="qty-input"
            />
            <span className="unit-label">{item.unit}</span>
            <button className="btn-sm btn-primary" onClick={saveQty}>Save</button>
            <button className="btn-sm btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        ) : (
          <div className="qty-row">
            <span className="qty-text">{item.quantity} {item.unit}</span>
            <button className="btn-sm btn-ghost" onClick={() => setEditing(true)}>Edit qty</button>
            <button className="btn-sm btn-danger" onClick={handleDelete}>Used</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, items, onDelete, onUpdate, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  if (items.length === 0) return null;
  return (
    <div className="section">
      <button className="section-header" onClick={() => setOpen((o) => !o)}>
        <span>{title} <span className="count">({items.length})</span></span>
        <span className="chevron">{open ? '▾' : '▸'}</span>
      </button>
      {open && items.map((item) => (
        <ItemCard key={item._id} item={item} onDelete={onDelete} onUpdate={onUpdate} />
      ))}
    </div>
  );
}

export default function PantryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getPantryItems();
      setItems(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    await deletePantryItem(id);
    setItems((prev) => prev.filter((i) => i._id !== id));
  }

  async function handleUpdate(id, data) {
    const res = await updatePantryItem(id, data);
    setItems((prev) => prev.map((i) => (i._id === id ? res.data : i)));
  }

  function handleRefresh() {
    setRefreshing(true);
    load();
  }

  const expiringSoon = items.filter((i) => {
    const d = getDaysUntilExpiry(i.estimatedExpiry);
    return d !== null && d <= 3 && d >= 0;
  });
  const fresh = items.filter((i) => {
    const d = getDaysUntilExpiry(i.estimatedExpiry);
    return d === null || d > 3;
  });
  const expired = items.filter((i) => {
    const d = getDaysUntilExpiry(i.estimatedExpiry);
    return d !== null && d < 0;
  });

  if (loading) return <div className="center-msg">Loading pantry...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Pantry</h1>
        <button className="btn-sm btn-ghost" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>Your pantry is empty.</p>
          <p className="muted">Add items manually or parse a Walmart order.</p>
        </div>
      ) : (
        <>
          <Section title="Expiring Soon" items={expiringSoon} onDelete={handleDelete} onUpdate={handleUpdate} />
          <Section title="Fresh" items={fresh} onDelete={handleDelete} onUpdate={handleUpdate} />
          <Section title="Expired" items={expired} onDelete={handleDelete} onUpdate={handleUpdate} defaultOpen={false} />
        </>
      )}
    </div>
  );
}
