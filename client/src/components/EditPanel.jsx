import { useState } from 'react';

export default function EditPanel({ fields, values, onSave, onDelete, onCancel }) {
  const [form, setForm] = useState({ ...values });
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="edit-panel">
      {fields.map(f => (
        <div className="form-group" key={f.key}>
          <label className="form-label">{f.label}</label>
          {f.type === 'select' ? (
            <select
              className="form-select"
              value={form[f.key] || ''}
              onChange={e => handleChange(f.key, e.target.value)}
            >
              {f.options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : f.type === 'toggle' ? (
            <div className="form-toggle-row">
              <span className="form-label" style={{ marginBottom: 0 }}>{f.label}</span>
              <button
                type="button"
                className={`toggle ${form[f.key] ? 'active' : ''}`}
                onClick={() => handleChange(f.key, !form[f.key])}
              />
            </div>
          ) : (
            <input
              className="form-input"
              type={f.type || 'text'}
              value={form[f.key] || ''}
              onChange={e => handleChange(f.key, f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
            />
          )}
        </div>
      ))}

      <div className="edit-panel-actions">
        <button className="btn btn-primary btn-sm" onClick={() => onSave(form)}>Save</button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        {onDelete && (
          <button
            className="btn btn-danger"
            style={{ marginLeft: 'auto' }}
            onClick={() => setShowConfirm(true)}
          >
            Delete
          </button>
        )}
      </div>

      {showConfirm && (
        <div className="confirm-overlay" onClick={() => setShowConfirm(false)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <p>Are you sure you want to delete this?</p>
            <div className="confirm-actions">
              <button className="btn btn-danger" onClick={() => { setShowConfirm(false); onDelete(); }}>Delete</button>
              <button className="btn btn-ghost" onClick={() => setShowConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
