import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { life, pantry, routines as routinesApi } from '../utils/api';
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
  const [queue, setQueue] = useState([]);
  const [recentWins, setRecentWins] = useState([]);
  const [expiringCount, setExpiringCount] = useState(0);
  const navigate = useNavigate();

  async function load() {
    try {
      const [rightNow, tasks, stats] = await Promise.all([
        life.getRightNow(),
        routinesApi.list(),
        pantry.stats().catch(() => ({ expiringSoon: 0 }))
      ]);

      setData(rightNow);
      setExpiringCount(stats.expiringSoon || 0);

      // Build queue: today's incomplete tasks (excluding the focus task)
      const today = new Date().getDay();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayTasks = tasks.filter(t =>
        t.isActive && t.preferredTime?.daysOfWeek?.includes(today)
      );

      const incomplete = todayTasks.filter(t => {
        if (t.lastCompleted && new Date(t.lastCompleted) >= todayStart) return false;
        // Skip the current focus task
        if (rightNow.type === 'chore' && rightNow.title === t.name) return false;
        return true;
      });

      setQueue(incomplete.map(t => ({
        id: t._id,
        name: t.name,
        minutes: t.estimatedMinutes || null
      })));

      // Build recent wins: tasks completed today or yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const completed = todayTasks
        .filter(t => t.lastCompleted && new Date(t.lastCompleted) >= yesterday)
        .map(t => {
          const completedDate = new Date(t.lastCompleted);
          const isToday = completedDate >= todayStart;
          return {
            name: t.name,
            minutes: t.estimatedMinutes || null,
            when: isToday ? 'today' : 'yesterday'
          };
        })
        .slice(0, 4);

      setRecentWins(completed);
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
    if (action.url) { navigate(action.url); return; }
    if (action.action === 'refresh') { setLoading(true); await load(); return; }
    if (action.label === 'Start Timer') { setShowTimer(true); return; }
  }

  async function handleSecondary(sa) {
    if (sa.action === 'complete' && sa.taskId) {
      await routinesApi.complete(sa.taskId);
      setLoading(true); await load();
    } else if (sa.action === 'skip' && sa.taskId) {
      await routinesApi.skip(sa.taskId);
      setLoading(true); await load();
    } else if (sa.action === 'consume' && sa.itemId) {
      await pantry.consume(sa.itemId);
      setLoading(true); await load();
    } else if (sa.action === 'dismiss') {
      setData({ type: 'calm', title: "You're all caught up.", tip: null });
    } else if (sa.action === 'refresh') {
      setLoading(true); await load();
    }
  }

  // Timer fullscreen
  if (showTimer && data?.type === 'chore') {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20 }}>{data.title}</h2>
          {data.tip && (
            <BionicText as="p" style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>{data.tip}</BionicText>
          )}
        </div>
        <Timer
          minutes={data.timerMinutes || 10}
          onComplete={async () => {
            if (data.action?.taskId) await routinesApi.complete(data.action.taskId);
            setShowTimer(false);
            setLoading(true);
            await load();
          }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            className="btn btn-success btn-lg"
            onClick={async () => {
              if (data.action?.taskId) await routinesApi.complete(data.action.taskId);
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

  if (loading) return <div className="center-msg">Loading...</div>;

  return (
    <div style={{
      maxWidth: 480,
      margin: '0 auto',
      padding: '40px 20px 120px',
    }}>

      {/* Section 1: Greeting */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>
          {getGreeting()}
        </p>
        {data?.kidsUntil && (
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
            Rose and Will are with you until {data.kidsUntil}. 👧👦
          </p>
        )}
      </div>

      {/* Section 2: Focus Card */}
      {data && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: 32,
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)',
          marginBottom: 32
        }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>{emoji}</div>

          <h2 style={{ fontSize: 20, marginBottom: 6 }}>{data.title}</h2>

          {data.subtitle && (
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
              {data.subtitle}
            </p>
          )}

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

          {data.action && (
            <button
              className="btn btn-primary btn-lg"
              onClick={() => handleAction(data.action)}
            >
              {data.action.label}
            </button>
          )}

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

      {/* Section 3: Queue */}
      {queue.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: 12, fontWeight: 500, color: 'var(--text-muted)',
            paddingBottom: 8, borderBottom: '1px solid var(--border-light)',
            marginBottom: 8, letterSpacing: '0.5px'
          }}>
            Coming up
          </div>
          {queue.map(item => (
            <div
              key={item.id}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid var(--border-light)',
                cursor: 'pointer'
              }}
              onClick={() => navigate('/routines')}
            >
              <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{item.name}</span>
              {item.minutes && (
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>~{item.minutes} min</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Section 4: Recent Wins */}
      {recentWins.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: 12, fontWeight: 500, color: 'var(--text-muted)',
            paddingBottom: 8, borderBottom: '1px solid var(--border-light)',
            marginBottom: 8, letterSpacing: '0.5px'
          }}>
            Recent wins
          </div>
          {recentWins.map((win, i) => (
            <div
              key={i}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', fontSize: 13, color: 'var(--text-muted)'
              }}
            >
              <span>
                <span style={{ color: 'var(--accent-success)' }}>✓</span>{' '}
                {win.name}
                {win.minutes && <span> — {win.minutes} min</span>}
              </span>
              <span>{win.when}</span>
            </div>
          ))}
        </div>
      )}

      {/* Section 5: Quick Glance */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 12, color: 'var(--text-muted)'
      }}>
        {expiringCount > 0 && (
          <button
            className="btn-link"
            style={{ fontSize: 12, color: 'var(--text-muted)' }}
            onClick={() => navigate('/pantry')}
          >
            {expiringCount} item{expiringCount !== 1 ? 's' : ''} expiring this week →
          </button>
        )}
      </div>
    </div>
  );
}
