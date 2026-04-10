import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { pantry, life, routines } from '../utils/api';
import { daysUntil, getExpiryClass, getExpiryLabel, CATEGORY_EMOJI, formatDate } from '../utils/helpers';

export default function HomePage() {
  const [tip, setTip] = useState('');
  const [onboarding, setOnboarding] = useState(null);
  const [stats, setStats] = useState(null);
  const [expiring, setExpiring] = useState([]);
  const [todayRoutines, setTodayRoutines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      routines.getDailyTip(),
      life.getOnboarding(),
      pantry.stats(),
      pantry.expiringIngredients(),
      routines.list()
    ]).then(([tipRes, onbRes, statsRes, expRes, routRes]) => {
      if (tipRes.status === 'fulfilled') setTip(tipRes.value.tip);
      if (onbRes.status === 'fulfilled') setOnboarding(onbRes.value);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (expRes.status === 'fulfilled') setExpiring(expRes.value.slice(0, 5));

      if (routRes.status === 'fulfilled') {
        const today = new Date().getDay();
        const todayTasks = routRes.value.filter(r =>
          r.isActive && r.preferredTime?.daysOfWeek?.includes(today)
        );
        setTodayRoutines(todayTasks);
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="center-msg">Loading...</div>;

  const showOnboarding = onboarding && onboarding.phase !== 'active';

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">Life AI</h1>
      </div>

      {/* Daily ADHD Tip */}
      {tip && (
        <div className="card card-accent mb-16">
          <p className="muted mb-8" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Daily tip
          </p>
          <p style={{ fontWeight: 500 }}>{tip}</p>
        </div>
      )}

      {/* Onboarding Banner */}
      {showOnboarding && (
        <div className="card mb-16" style={{ borderColor: 'var(--accent-secondary)' }}>
          {onboarding.phase === 'not_started' ? (
            <>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Welcome to Life AI!</p>
              <p className="muted mb-12">Start a 7-day data gathering phase. Check in hourly so we can learn your patterns.</p>
              <Link to="/checkin" className="btn btn-primary btn-lg" style={{ textDecoration: 'none' }}>
                Start Data Gathering
              </Link>
            </>
          ) : onboarding.phase === 'data_gathering' ? (
            <>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Data Gathering In Progress</p>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(onboarding.totalCheckins / onboarding.targetCheckins) * 100}%` }} />
              </div>
              <p className="muted" style={{ fontSize: 12 }}>
                {onboarding.totalCheckins} / {onboarding.targetCheckins} check-ins - Ends {formatDate(onboarding.endsAt)}
              </p>
            </>
          ) : onboarding.phase === 'pattern_review' ? (
            <>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Ready to Review Patterns!</p>
              <p className="muted mb-12">Your data gathering is complete. Let's analyze your patterns.</p>
              <Link to="/checkin" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                Review Patterns
              </Link>
            </>
          ) : null}
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Items</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: stats.expiringSoon > 0 ? 'var(--accent-warning)' : undefined }}>
              {stats.expiringSoon}
            </div>
            <div className="stat-label">Expiring</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: stats.expired > 0 ? 'var(--accent-danger)' : undefined }}>
              {stats.expired}
            </div>
            <div className="stat-label">Expired</div>
          </div>
        </div>
      )}

      {/* Expiring Items */}
      {expiring.length > 0 && (
        <div className="section">
          <p className="section-title">Expiring Soon</p>
          {expiring.map(item => {
            const days = daysUntil(item.estimatedExpiry);
            return (
              <div key={item._id} className="card slide-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                <div>
                  <span style={{ marginRight: 6 }}>{CATEGORY_EMOJI[item.category] || '📦'}</span>
                  <span style={{ fontWeight: 500 }}>{item.name}</span>
                </div>
                <span className={`expiry-badge ${getExpiryClass(days)}`}>
                  {getExpiryLabel(days)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Today's Routines */}
      {todayRoutines.length > 0 && (
        <div className="section">
          <p className="section-title">Today's Routines</p>
          {todayRoutines.map(task => {
            const isDone = task.lastCompleted && new Date(task.lastCompleted).toDateString() === new Date().toDateString();
            return (
              <div key={task._id} className="card slide-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', opacity: isDone ? 0.5 : 1 }}>
                <span style={{ fontWeight: 500 }}>
                  {isDone ? '✓ ' : ''}{task.name}
                </span>
                {task.streak > 0 && (
                  <span className="streak-display">🔥 {task.streak}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Actions */}
      <div className="section">
        <p className="section-title">Quick Actions</p>
        <div className="quick-actions">
          <Link to="/pantry" className="quick-action">
            <div className="quick-action-icon">🧊</div>
            <div className="quick-action-label">Pantry</div>
          </Link>
          <Link to="/checkin" className="quick-action">
            <div className="quick-action-icon">📊</div>
            <div className="quick-action-label">Check In</div>
          </Link>
          <Link to="/routines" className="quick-action">
            <div className="quick-action-icon">✅</div>
            <div className="quick-action-label">Routines</div>
          </Link>
          <Link to="/recipes" className="quick-action">
            <div className="quick-action-icon">🍳</div>
            <div className="quick-action-label">Recipes</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
