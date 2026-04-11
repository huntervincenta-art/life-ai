import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { pantry, life, routines } from '../utils/api';
import { daysUntil, getExpiryLabel, DAY_NAMES_FULL } from '../utils/helpers';

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
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

// Custody cycle check
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
  const cycleWeek = ((weeksDiff % 4) + 4) % 4;
  const actualWeek = ((cycleWeek + 3) % 4) + 1;
  const isMyWeekend = actualWeek !== 4;
  const isWeekday = day >= 1 && day <= 5;
  const isMonWed = day === 1 || day === 3;

  if (day === 5 || day === 6 || day === 0) {
    return isMyWeekend ? 'Kids are with you this weekend' : "Mom's weekend";
  }
  if (isMonWed) return 'Kids this afternoon (3:30-7pm)';
  return null;
}

export default function HomePage() {
  const [tip, setTip] = useState('');
  const [onboarding, setOnboarding] = useState(null);
  const [stats, setStats] = useState(null);
  const [expiring, setExpiring] = useState([]);
  const [todayRoutines, setTodayRoutines] = useState([]);
  const [syncState, setSyncState] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      routines.getDailyTip(),
      life.getOnboarding(),
      pantry.stats(),
      pantry.expiringIngredients(),
      routines.list(),
      pantry.syncStatus()
    ]).then(([tipRes, onbRes, statsRes, expRes, routRes, syncRes]) => {
      if (tipRes.status === 'fulfilled') setTip(tipRes.value.tip);
      if (onbRes.status === 'fulfilled') setOnboarding(onbRes.value);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (expRes.status === 'fulfilled') setExpiring(expRes.value);
      if (syncRes.status === 'fulfilled') setSyncState(syncRes.value);

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
    setSyncResult(null);
    try {
      const result = await pantry.sync();
      setSyncResult(result);
      const [updated, newStats] = await Promise.all([pantry.syncStatus(), pantry.stats()]);
      setSyncState(updated);
      setStats(newStats);
    } catch (e) {
      setSyncResult({ errors: [e.message] });
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return <div className="center-msg">Loading...</div>;

  // Decide focus card content
  const custodyContext = getCustodyContext();
  const now = new Date();
  const doneToday = todayRoutines.filter(t => t.lastCompleted && new Date(t.lastCompleted).toDateString() === now.toDateString()).length;
  const nextChore = todayRoutines.find(t => !t.lastCompleted || new Date(t.lastCompleted).toDateString() !== now.toDateString());
  const urgentItem = expiring.length > 0 ? expiring[0] : null;
  const urgentDays = urgentItem ? daysUntil(urgentItem.estimatedExpiry) : null;
  const isDataGathering = onboarding?.phase === 'data_gathering';

  let focusEmoji = '🧘';
  let focusTitle = '';
  let focusDesc = '';
  let focusAction = null;

  if (isDataGathering) {
    focusEmoji = '📊';
    focusTitle = 'Time to check in';
    focusDesc = `${onboarding.totalCheckins}/${onboarding.targetCheckins} check-ins logged`;
    focusAction = <Link to="/checkin" className="btn btn-primary btn-lg" style={{ textDecoration: 'none' }}>Check In Now</Link>;
  } else if (urgentDays !== null && urgentDays <= 1) {
    focusEmoji = '🍳';
    focusTitle = `Use up: ${urgentItem.name}`;
    focusDesc = urgentDays <= 0 ? 'Expired — cook or toss it today' : 'Expires tomorrow';
    focusAction = <Link to="/recipes" className="btn btn-primary btn-lg" style={{ textDecoration: 'none' }}>Find a Recipe</Link>;
  } else if (nextChore) {
    focusEmoji = '✅';
    focusTitle = nextChore.name;
    focusDesc = nextChore.adhdStrategy || `${nextChore.estimatedMinutes || '?'} min`;
    focusAction = <Link to="/routines" className="btn btn-primary btn-lg" style={{ textDecoration: 'none' }}>Start</Link>;
  } else if (tip) {
    focusEmoji = '💡';
    focusTitle = 'Daily reminder';
    focusDesc = tip;
  }

  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="page fade-in">
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">{getGreeting()}, Hunter.</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
          {dateStr}
          {custodyContext && <span style={{ color: 'var(--accent-secondary)' }}> — {custodyContext}</span>}
        </p>
      </div>

      {/* Focus Card */}
      <div className="focus-card">
        <div className="focus-card-emoji">{focusEmoji}</div>
        <div className="focus-card-title">{focusTitle}</div>
        <div className="focus-card-desc">{focusDesc}</div>
        {focusAction}
      </div>

      {/* Stat pills */}
      <div className="stat-pills">
        <Link to="/pantry" className="stat-pill">
          <span className="stat-pill-num">{stats?.expiringSoon || 0}</span>
          <span>expiring soon</span>
        </Link>

        <Link to="/routines" className="stat-pill">
          <span className="stat-pill-num">{doneToday}/{todayRoutines.length}</span>
          <span>tasks done</span>
        </Link>

        <button className="stat-pill" onClick={handleSync} disabled={syncing}>
          {syncing ? (
            <span>Syncing...</span>
          ) : (
            <>
              <span>Sync'd {timeAgo(syncState?.lastSyncAt)}</span>
            </>
          )}
        </button>
      </div>

      {/* Sync result toast */}
      {syncResult && !syncing && (
        <p style={{
          fontSize: 12,
          marginTop: 10,
          textAlign: 'center',
          color: syncResult.errors?.length > 0 && !syncResult.newOrders ? 'var(--accent-danger)' : 'var(--accent-success)'
        }}>
          {syncResult.newOrders !== undefined
            ? `${syncResult.newOrders} new orders, ${syncResult.newItems} items added`
            : `Error: ${syncResult.errors?.[0]}`}
        </p>
      )}
    </div>
  );
}
