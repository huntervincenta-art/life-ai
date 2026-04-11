import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { pantry, life, routines } from '../utils/api';
import { daysUntil, getExpiryLabel } from '../utils/helpers';
import BionicText from '../components/BionicText';

function timeAgo(dateStr) {
  if (!dateStr) return 'never';
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getCustodyContext() {
  const now = new Date();
  const day = now.getDay();
  const anchor = new Date('2026-03-28T00:00:00');
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const sat = new Date(now);
  sat.setDate(now.getDate() + (6 - day));
  sat.setHours(0, 0, 0, 0);
  anchor.setHours(0, 0, 0, 0);
  const weeksDiff = Math.round((sat - anchor) / msPerWeek);
  const actualWeek = ((((weeksDiff % 4) + 4) % 4 + 3) % 4) + 1;
  const isMyWeekend = actualWeek !== 4;

  // Fri-Mon = weekend custody block
  if (day >= 5 || day === 0) {
    if (isMyWeekend) return { text: 'You have the kids this weekend!', detail: 'Rose and Will are with you until Monday 8am.', hasKids: true };
    return { text: "Kids are with mom this weekend.", detail: 'Monday afternoon at 3:30.', hasKids: false };
  }
  if (day === 1) {
    if (isMyWeekend) return { text: 'Rose and Will are here until 8am.', detail: 'Kids coming back at 3:30 this afternoon too.', hasKids: true };
    return { text: 'Kids coming at 3:30 today.', detail: null, hasKids: true };
  }
  if (day === 3) return { text: 'Kids coming at 3:30 today.', detail: null, hasKids: true };
  // Tue, Thu
  const nextDay = day === 2 ? 'Wednesday' : 'Friday';
  return { text: `Next up: kids on ${nextDay}.`, detail: null, hasKids: false };
}

export default function HomePage() {
  const [tip, setTip] = useState('');
  const [stats, setStats] = useState(null);
  const [expiring, setExpiring] = useState([]);
  const [todayRoutines, setTodayRoutines] = useState([]);
  const [kidSuggestions, setKidSuggestions] = useState(null);
  const [syncState, setSyncState] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  const custody = getCustodyContext();

  useEffect(() => {
    Promise.allSettled([
      routines.getDailyTip(),
      pantry.stats(),
      pantry.expiringIngredients(),
      routines.list(),
      pantry.syncStatus(),
      custody.hasKids ? routines.getKidSuggestions() : Promise.resolve(null)
    ]).then(([tipRes, statsRes, expRes, routRes, syncRes, kidsRes]) => {
      if (tipRes.status === 'fulfilled') setTip(tipRes.value.tip);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (expRes.status === 'fulfilled') setExpiring(expRes.value);
      if (syncRes.status === 'fulfilled') setSyncState(syncRes.value);
      if (kidsRes.status === 'fulfilled' && kidsRes.value) setKidSuggestions(kidsRes.value);

      if (routRes.status === 'fulfilled') {
        const today = new Date().getDay();
        setTodayRoutines(routRes.value.filter(r =>
          r.isActive && r.preferredTime?.daysOfWeek?.includes(today)
        ));
      }
      setLoading(false);
    });
  }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      await pantry.sync();
      const [updated, newStats] = await Promise.all([pantry.syncStatus(), pantry.stats()]);
      setSyncState(updated);
      setStats(newStats);
    } catch (e) { console.error(e); }
    finally { setSyncing(false); }
  }

  async function shuffleKids() {
    try {
      const data = await routines.getKidSuggestions();
      setKidSuggestions(data);
    } catch (e) { console.error(e); }
  }

  if (loading) return <div className="center-msg">Loading...</div>;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const doneToday = todayRoutines.filter(t => t.lastCompleted && new Date(t.lastCompleted).toDateString() === now.toDateString());
  const pendingRoutines = todayRoutines.filter(t => !t.lastCompleted || new Date(t.lastCompleted).toDateString() !== now.toDateString());

  return (
    <div className="page fade-in">

      {/* ─── Greeting ─── */}
      <div style={{ marginBottom: 6 }}>
        <h1 className="page-title">{getGreeting()}, Hunter.</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 2 }}>
          {dateStr} — <span style={{ color: custody.hasKids ? 'var(--accent-teal)' : 'var(--text-muted)' }}>{custody.text}</span>
        </p>
        {custody.detail && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{custody.detail}</p>
        )}
      </div>

      <hr className="divider" />

      {/* ─── Today's Focus ─── */}
      {pendingRoutines.length > 0 && (
        <div className="section">
          <div className="section-label">Today's focus</div>
          {pendingRoutines.map(task => (
            <div key={task._id} className="list-item">
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>[ ]</span>
              <div className="list-item-body">
                <div className="list-item-title">{task.name}</div>
                {task.adhdStrategy && (
                  <BionicText as="div" className="list-item-meta" style={{ marginTop: 2 }}>
                    {'💡 ' + task.adhdStrategy.split(': ').slice(1).join(': ')}
                  </BionicText>
                )}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>~{task.estimatedMinutes || '?'}m</span>
            </div>
          ))}
          {doneToday.length > 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              ✓ {doneToday.length} done today
            </p>
          )}
        </div>
      )}

      {pendingRoutines.length === 0 && todayRoutines.length > 0 && (
        <div className="section">
          <div className="section-label">Today's focus</div>
          <p style={{ color: 'var(--accent-green)', fontSize: 14 }}>All done for today. Nice work.</p>
        </div>
      )}

      {pendingRoutines.length === 0 && todayRoutines.length === 0 && tip && (
        <div className="section">
          <div className="section-label">Daily thought</div>
          <BionicText as="p" style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {tip}
          </BionicText>
        </div>
      )}

      <hr className="divider" />

      {/* ─── Pantry Heads Up ─── */}
      <div className="section">
        <div className="section-label">Pantry heads up</div>
        {expiring.length > 0 ? (
          <Link to="/pantry" style={{ textDecoration: 'none', color: 'var(--accent-gold)', fontSize: 14 }}>
            {expiring.length} item{expiring.length !== 1 ? 's' : ''} expiring in the next 3 days →
          </Link>
        ) : (
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Nothing expiring soon. You're good.</p>
        )}
      </div>

      {/* ─── Fun with the kids ─── */}
      {custody.hasKids && kidSuggestions && (
        <>
          <hr className="divider" />
          <div className="section">
            <div className="section-label">Fun with the kids</div>
            {kidSuggestions.rose && (
              <div className="list-item">
                <span className="list-item-emoji">🎨</span>
                <div className="list-item-body">
                  <div className="list-item-title">Rose: {kidSuggestions.rose.title}</div>
                  <BionicText as="div" className="list-item-meta">{kidSuggestions.rose.desc}</BionicText>
                </div>
              </div>
            )}
            {kidSuggestions.will && (
              <div className="list-item">
                <span className="list-item-emoji">🏎️</span>
                <div className="list-item-body">
                  <div className="list-item-title">Will: {kidSuggestions.will.title}</div>
                  <BionicText as="div" className="list-item-meta">{kidSuggestions.will.desc}</BionicText>
                </div>
              </div>
            )}
            <button className="btn-link" style={{ marginTop: 8 }} onClick={shuffleKids}>↻ Shuffle suggestions</button>
          </div>
        </>
      )}

      <hr className="divider" />

      {/* ─── Bottom: subtle stats ─── */}
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        <Link to="/pantry" style={{ color: 'inherit', textDecoration: 'none' }}>
          {stats?.total || 0} items · {stats?.expiringSoon || 0} expiring
        </Link>
        <span>·</span>
        <button
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? 'syncing...' : `sync'd ${timeAgo(syncState?.lastSyncAt)}`}
        </button>
      </div>

    </div>
  );
}
