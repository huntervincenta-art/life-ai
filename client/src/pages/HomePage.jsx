import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { life, pantry, routines } from '../utils/api';
import BionicText from '../components/BionicText';
import Timer from '../components/Timer';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning, Hunter.';
  if (h < 17) return 'Good afternoon, Hunter.';
  return 'Good evening, Hunter.';
}

export default function HomePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTimer, setShowTimer] = useState(false);
  const navigate = useNavigate();

  async function load() {
    try {
      setData(await life.getRightNow());
    } catch (e) {
      console.error(e);
      setData({ type: 'calm', title: "You're all caught up.", tip: null });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAction(action) {
    if (!action) return;

    if (action.url) {
      navigate(action.url);
      return;
    }

    if (action.action === 'refresh') {
      setLoading(true);
      await load();
      return;
    }

    if (action.label === 'Start Timer') {
      setShowTimer(true);
      return;
    }
  }

  async function handleSecondary(sa) {
    if (sa.action === 'complete' && sa.taskId) {
      await routines.complete(sa.taskId);
      setLoading(true);
      await load();
    } else if (sa.action === 'skip' && sa.taskId) {
      await routines.skip(sa.taskId);
      setLoading(true);
      await load();
    } else if (sa.action === 'consume' && sa.itemId) {
      await pantry.consume(sa.itemId);
      setLoading(true);
      await load();
    } else if (sa.action === 'dismiss') {
      setData({ type: 'calm', title: "You're all caught up.", tip: null });
    } else if (sa.action === 'refresh') {
      setLoading(true);
      await load();
    }
  }

  // Timer fullscreen
  if (showTimer && data?.type === 'chore') {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>{data.title}</h2>
          {data.tip && (
            <BionicText as="p" style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>{data.tip}</BionicText>
          )}
        </div>
        <Timer
          minutes={data.timerMinutes || 10}
          onComplete={async () => {
            if (data.action?.taskId) await routines.complete(data.action.taskId);
            setShowTimer(false);
            setLoading(true);
            await load();
          }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            className="btn btn-success btn-lg"
            onClick={async () => {
              if (data.action?.taskId) await routines.complete(data.action.taskId);
              setShowTimer(false);
              setLoading(true);
              await load();
            }}
          >
            Done!
          </button>
        </div>
        <button
          className="btn-link"
          style={{ display: 'block', margin: '16px auto 0', color: 'var(--text-muted)' }}
          onClick={() => setShowTimer(false)}
        >
          Back
        </button>
      </div>
    );
  }

  const emoji = data?.type === 'expiring_food' ? '🍽️'
    : data?.type === 'chore' ? '✅'
    : data?.type === 'kid_activity' ? (data.emoji || '🎮')
    : data?.type === 'calm' ? '☁️'
    : '';

  return (
    <div style={{
      maxWidth: 480,
      margin: '0 auto',
      padding: '40px 20px',
      minHeight: 'calc(100vh - 120px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>

      {/* Greeting */}
      <p style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 32 }}>
        {getGreeting()}
      </p>

      {/* Focus card */}
      {!loading && data && (
        <div style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 32,
          textAlign: 'center'
        }}>
          {/* Emoji */}
          <div style={{ fontSize: 36, marginBottom: 16 }}>{emoji}</div>

          {/* Title */}
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>{data.title}</h2>

          {/* Subtitle */}
          {data.subtitle && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{data.subtitle}</p>
          )}

          {/* Tip */}
          {data.tip && (
            <BionicText
              as="p"
              style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
                marginBottom: 24,
                textAlign: 'left',
                padding: '0 4px'
              }}
            >
              {'💡 ' + data.tip}
            </BionicText>
          )}

          {/* Primary action */}
          {data.action && (
            <button
              className="btn btn-primary"
              style={{ width: '100%', height: 48, fontSize: 15, borderRadius: 12 }}
              onClick={() => handleAction(data.action)}
            >
              {data.action.label}
            </button>
          )}

          {/* Secondary actions */}
          {data.secondaryActions && data.secondaryActions.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 4 }}>
              {data.secondaryActions.map((sa, i) => (
                <span key={i}>
                  {i > 0 && <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>·</span>}
                  <button
                    className="btn-link"
                    style={{ color: 'var(--text-muted)', fontSize: 13 }}
                    onClick={() => handleSecondary(sa)}
                  >
                    {sa.label}
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Kids context */}
      {!loading && data?.kidsUntil && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 32 }}>
          Rose and Will are with you until {data.kidsUntil}. 👧👦
        </p>
      )}
    </div>
  );
}
