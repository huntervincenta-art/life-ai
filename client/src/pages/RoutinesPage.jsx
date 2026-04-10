import { useState, useEffect, useCallback } from 'react';
import { routines } from '../utils/api';
import Timer from '../components/Timer';

export default function RoutinesPage() {
  const [tab, setTab] = useState('today');
  const [tasks, setTasks] = useState([]);
  const [kidActivities, setKidActivities] = useState([]);
  const [strategy, setStrategy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timerTask, setTimerTask] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await routines.list();
      setTasks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab === 'kids') {
      routines.getKidActivities({ count: 4 })
        .then(setKidActivities)
        .catch(() => {});
    }
  }, [tab]);

  const today = new Date().getDay();
  const todayTasks = tasks.filter(t => t.isActive && t.preferredTime?.daysOfWeek?.includes(today));
  const isCompletedToday = (task) => task.lastCompleted && new Date(task.lastCompleted).toDateString() === new Date().toDateString();

  async function handleComplete(id) {
    const updated = await routines.complete(id);
    setTasks(prev => prev.map(t => t._id === id ? updated : t));
    if (timerTask?._id === id) setTimerTask(null);
  }

  async function handleSkip(id) {
    const updated = await routines.skip(id);
    setTasks(prev => prev.map(t => t._id === id ? updated : t));
  }

  async function loadStrategy() {
    const s = await routines.getStrategy('general_cleaning');
    setStrategy(s);
  }

  async function refreshKidActivities() {
    const data = await routines.getKidActivities({ count: 4 });
    setKidActivities(data);
  }

  async function handleSeedDefaults() {
    await routines.seedDefaults();
    load();
  }

  if (loading) return <div className="center-msg">Loading...</div>;

  // Timer fullscreen
  if (timerTask) {
    return (
      <div className="page fade-in">
        <div className="page-header">
          <h1 className="page-title">{timerTask.name}</h1>
          <button className="btn btn-sm btn-ghost" onClick={() => setTimerTask(null)}>Close</button>
        </div>
        {timerTask.adhdStrategy && (
          <div className="card card-accent mb-16">
            <p className="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>Strategy</p>
            <p style={{ fontWeight: 500, marginTop: 4 }}>{timerTask.adhdStrategy}</p>
          </div>
        )}
        <Timer minutes={timerTask.timerMinutes || 10} onComplete={() => handleComplete(timerTask._id)} />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn btn-success btn-lg" onClick={() => handleComplete(timerTask._id)}>
            Done!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">Routines</h1>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        <button className={`tab${tab === 'today' ? ' active' : ''}`} onClick={() => setTab('today')}>Today</button>
        <button className={`tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>All</button>
        <button className={`tab${tab === 'kids' ? ' active' : ''}`} onClick={() => setTab('kids')}>Kids</button>
      </div>

      {/* Today Tab */}
      {tab === 'today' && (
        <>
          {todayTasks.length === 0 ? (
            <div className="empty-state">
              <div className="emoji">✅</div>
              <p>No routines scheduled today</p>
              <p className="muted mb-16">Add routines or seed defaults</p>
              <button className="btn btn-primary" onClick={handleSeedDefaults}>Seed Default Routines</button>
            </div>
          ) : (
            todayTasks.map(task => {
              const done = isCompletedToday(task);
              return (
                <div key={task._id} className="card slide-up" style={{ opacity: done ? 0.5 : 1 }}>
                  <div className="flex-between mb-8">
                    <div>
                      <span style={{ fontWeight: 600 }}>{task.name}</span>
                      {task.estimatedMinutes && (
                        <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>{task.estimatedMinutes}m</span>
                      )}
                    </div>
                    {task.streak > 0 && <span className="streak-display">🔥 {task.streak}</span>}
                  </div>

                  {task.adhdStrategy && !done && (
                    <p className="muted" style={{ fontSize: 12, marginBottom: 8, fontStyle: 'italic' }}>
                      {task.adhdStrategy}
                    </p>
                  )}

                  {!done && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-success" style={{ flex: 1 }} onClick={() => handleComplete(task._id)}>
                        Done
                      </button>
                      <button className="btn btn-sm btn-ghost" onClick={() => handleSkip(task._id)}>Skip</button>
                      {task.timerEnabled && (
                        <button className="btn btn-sm btn-primary" onClick={() => setTimerTask(task)}>Timer</button>
                      )}
                    </div>
                  )}
                  {done && <p className="muted" style={{ fontSize: 12 }}>Completed today</p>}
                </div>
              );
            })
          )}

          {/* Strategy card */}
          <div className="card mb-16" style={{ marginTop: 16 }}>
            <div className="flex-between">
              <p style={{ fontWeight: 600 }}>Need motivation?</p>
              <button className="btn btn-sm btn-primary" onClick={loadStrategy}>
                {strategy ? 'Another' : 'Get Strategy'}
              </button>
            </div>
            {strategy && (
              <div style={{ marginTop: 10 }}>
                <p style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{strategy.name}</p>
                <p className="muted" style={{ marginTop: 4 }}>{strategy.tip}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* All Tab */}
      {tab === 'all' && (
        <>
          {tasks.length === 0 ? (
            <div className="empty-state">
              <div className="emoji">📋</div>
              <p>No routines yet</p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={handleSeedDefaults}>Seed Default Routines</button>
            </div>
          ) : (
            tasks.map(task => (
              <div key={task._id} className="card slide-up">
                <div className="flex-between mb-8">
                  <div>
                    <span style={{ fontWeight: 600 }}>{task.name}</span>
                    <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>{task.category}</span>
                  </div>
                  {task.streak > 0 && <span className="streak-display">🔥 {task.streak}</span>}
                </div>
                <p className="muted" style={{ fontSize: 12 }}>
                  {task.preferredTime?.daysOfWeek?.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}
                  {task.preferredTime?.hour !== undefined ? ` at ${task.preferredTime.hour}:00` : ''}
                </p>
              </div>
            ))
          )}
        </>
      )}

      {/* Kids Tab */}
      {tab === 'kids' && (
        <>
          <div className="flex-between mb-16">
            <p className="section-title" style={{ margin: 0 }}>Activity Ideas</p>
            <button className="btn btn-sm btn-primary" onClick={refreshKidActivities}>Refresh</button>
          </div>
          {kidActivities.map((a, i) => (
            <div key={i} className="card slide-up">
              <p style={{ fontWeight: 600, marginBottom: 4 }}>{a.title}</p>
              <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{a.description}</p>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>Ages: {a.ageRange}</span>
                <span>{a.duration}</span>
              </div>
              {a.supplies?.length > 0 && (
                <div className="chip-group" style={{ marginTop: 8 }}>
                  {a.supplies.map((s, j) => <span key={j} className="chip" style={{ cursor: 'default', minHeight: 'auto', padding: '4px 10px', fontSize: 11 }}>{s}</span>)}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
