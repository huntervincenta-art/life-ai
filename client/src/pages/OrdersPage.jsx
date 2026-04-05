import { useState, useEffect, useCallback } from 'react';
import { getWalmartOrders, parseEmail, getOrders } from '../api';
import { formatDate } from '../utils';

function formatCurrency(amount) {
  if (amount == null) return '—';
  return `$${Number(amount).toFixed(2)}`;
}

function DeliveryPill({ status }) {
  if (!status) return null;
  const s = status.toLowerCase();
  let cls = 'pill-grey';
  if (s.includes('delivered')) cls = 'pill-green';
  else if (s.includes('shipped') || s.includes('out for delivery')) cls = 'pill-amber';
  else if (s.includes('confirmed') || s.includes('placed')) cls = 'pill-grey';
  return <span className={`pill ${cls}`}>{status}</span>;
}

function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  const hasItems = order.parsedItems && order.parsedItems.length > 0;

  return (
    <div className="walmart-order-card">
      <div className="walmart-order-header">
        <div className="walmart-order-meta">
          <span className="walmart-order-num">
            {order.orderNumber ? `#${order.orderNumber}` : 'Unknown order'}
          </span>
          <span className="walmart-order-date">{formatDate(order.orderDate)}</span>
        </div>
        <div className="walmart-order-right">
          <span className="walmart-order-total">{formatCurrency(order.totalAmount)}</span>
          <DeliveryPill status={order.deliveryStatus} />
        </div>
      </div>

      {hasItems && (
        <>
          <button
            className="walmart-expand-btn"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? '▲ Hide items' : `▼ ${order.parsedItems.length} item${order.parsedItems.length !== 1 ? 's' : ''}`}
          </button>

          {expanded && (
            <div className="walmart-items-list">
              {order.parsedItems.map((item, i) => (
                <div key={i} className="walmart-item-row">
                  <span className="walmart-item-name">{item.name}</span>
                  <span className="walmart-item-price">{formatCurrency(item.price)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!hasItems && (
        <p className="walmart-no-items">No item details available</p>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  // Manual paste state
  const [showPaste, setShowPaste] = useState(false);
  const [emailText, setEmailText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [pasteError, setPasteError] = useState(null);
  const [pastePreview, setPastePreview] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getWalmartOrders();
      setOrders(res.data);
      setLastFetched(new Date());
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Summary stats
  const ordersWithTotal = orders.filter((o) => o.totalAmount != null);
  const totalSpent = ordersWithTotal.reduce((sum, o) => sum + o.totalAmount, 0);
  const avgOrder = ordersWithTotal.length > 0 ? totalSpent / ordersWithTotal.length : null;

  async function handlePaste() {
    if (!emailText.trim()) return;
    setParsing(true);
    setPasteError(null);
    setPastePreview(null);
    try {
      const res = await parseEmail(emailText);
      setPastePreview(res.data);
      const updated = await getOrders();
      // Merge with existing — just re-fetch all
      await fetchOrders();
      setEmailText('');
    } catch (e) {
      setPasteError(e.response?.data?.error || e.message);
    } finally {
      setParsing(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Walmart Orders</h1>
        <button
          className="btn-primary"
          onClick={fetchOrders}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && <p className="error-msg">{error}</p>}

      {/* Summary card */}
      {orders.length > 0 && (
        <div className="card walmart-summary-card">
          <div className="walmart-summary-grid">
            <div className="walmart-stat">
              <span className="walmart-stat-value">{formatCurrency(totalSpent)}</span>
              <span className="walmart-stat-label">Total Spent</span>
            </div>
            <div className="walmart-stat">
              <span className="walmart-stat-value">{orders.length}</span>
              <span className="walmart-stat-label">Orders</span>
            </div>
            <div className="walmart-stat">
              <span className="walmart-stat-value">{formatCurrency(avgOrder)}</span>
              <span className="walmart-stat-label">Avg Order</span>
            </div>
          </div>
          {lastFetched && (
            <p className="walmart-last-fetched">
              Last synced {lastFetched.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}

      {/* Orders list */}
      {loading && orders.length === 0 ? (
        <div className="center-msg">Fetching orders from Gmail…</div>
      ) : orders.length === 0 && !loading ? (
        <div className="center-msg">No Walmart orders found in the last 90 days.</div>
      ) : (
        <div className="section">
          <p className="section-title">Recent Orders</p>
          {orders.map((order) => (
            <OrderCard key={order._id} order={order} />
          ))}
        </div>
      )}

      {/* Manual paste section */}
      <div className="walmart-manual-section">
        <button
          className="walmart-toggle-paste"
          onClick={() => setShowPaste((v) => !v)}
        >
          {showPaste ? '▲ Hide manual entry' : '+ Add order manually'}
        </button>

        {showPaste && (
          <div className="card" style={{ marginTop: 8 }}>
            <p className="field-label">Paste a Walmart confirmation email</p>
            <textarea
              className="email-textarea"
              placeholder="Paste your Walmart order confirmation email here..."
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              rows={6}
            />
            <button
              className="btn-primary"
              onClick={handlePaste}
              disabled={parsing || !emailText.trim()}
            >
              {parsing ? 'Parsing...' : 'Parse Order'}
            </button>
            {pasteError && <p className="error-msg" style={{ marginTop: 8 }}>{pasteError}</p>}
            {pastePreview && (
              <p className="muted" style={{ marginTop: 8 }}>
                Added {pastePreview.items?.length ?? 0} items to pantry.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
