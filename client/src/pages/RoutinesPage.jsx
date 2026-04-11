import { useState, useEffect, useCallback } from 'react';
import { routines } from '../utils/api';
import Timer from '../components/Timer';

export default function RoutinesPage() {
  const [view, setView] = useState('today');
  const [tasks, setTasks] = useState([]);
  const [kidActivities, setKidActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timerTask, setTimerTask] = useState(null);
  const [expandedTip, setExpandedTip] = useState(null);

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

  async function handleSeedDefaults() {
    await routines.seedDefaults();
    load();
  }

  async function loadKidActivities() {
    const data = await routines.getKidActivities({ count: 4 });
    setKidActivities(data);
    setView('kids');
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
        <div className="routines-timer-layout">
          <div>
            <Timer minutes={timerTask.timerMinutes || 10} onComplete={() => handleComplete(timerTask._id)} />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-success btn-lg" onClick={() => handleComplete(timerTask._id)}>Done!</button>
            </div>
          </div>
          {timerTask.adhdStrategy && (
            <div className="card card-accent">
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Strategy</p>
              <p style={{ fontWeight: 500, marginTop: 4, fontSize: 14 }}>{timerTask.adhdStrategy}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">Routines</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm btn-ghost" onClick={() => setView(view === 'all' ? 'today' : 'all')}>
            {view === 'all' ? 'Today' : 'All'}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={loadKidActivities}>Kids</button>
        </div>
      </div>

      {/* Today's routines (default view) */}
      {view === 'today' && (
        <>
          {todayTasks.length === 0 ? (
            <div className="empty-state">
              <div className="emoji">✅</div>
              <p>No routines scheduled today</p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={handleSeedDefaults}>Seed Default Routines</button>
            </div>
          ) : (
            todayTasks.map(task => {
              const done = isCompletedToday(task);
              return (
                <div key={task._id} className={`routine-item${done ? ' done' : ''}`}>
                  <div className="flex-between">
                    <div>
                      <span style={{ fontWeight: 500 }}>{done ? '✓ ' : ''}{task.name}</span>
                      {task.estimatedMinutes && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{task.estimatedMinutes}m</span>
                      )}
                    </div>
                    {task.streak > 0 && <span className="streak-display">🔥 {task.streak}</span>}
                  </div>

                  {!done && (
                    <>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button className="btn btn-success" style={{ flex: 1 }} onClick={() => handleComplete(task._id)}>Done</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleSkip(task._id)}>Skip</button>
                        {task.timerEnabled && (
                          <button className="btn btn-sm btn-primary" onClick={() => setTimerTask(task)}>Timer</button>
                        )}
                      </div>

                      {task.adhdStrategy && (
                        <div
                          className="routine-tip"
                          onClick={() => setExpandedTip(expandedTip === task._id ? null : task._id)}
                        >
                          {expandedTip === task._id ? task.adhdStrategy : '💡 Show tip'}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </>
      )}

      {/* All routines */}
      {view === 'all' && (
        <>
          {tasks.length === 0 ? (
            <div className="empty-state">
              <div className="emoji">📋</div>
              <p>No routines yet</p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={handleSeedDefaults}>Seed Default Routines</button>
            </div>
          ) : (
            tasks.map(task => (
              <div key={task._id} className="routine-item">
                <div className="flex-between">
                  <div>
                    <span style={{ fontWeight: 500 }}>{task.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{task.category}</span>
                  </div>
                  {task.streak > 0 && <span className="streak-display">🔥 {task.streak}</span>}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {task.preferredTime?.daysOfWeek?.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}
                  {task.preferredTime?.hour !== undefined ? ` at ${task.preferredTime.hour}:00` : ''}
                </p>
              </div>
            ))
          )}
        </>
      )}

      {/* Kids activities */}
      {view === 'kids' && (
        <>
          <div className="flex-between mb-16">
            <div className="section-title" style={{ margin: 0 }}>Activity Ideas</div>
            <button className="btn btn-sm btn-ghost" onClick={loadKidActivities}>Refresh</button>
          </div>
          {kidActivities.map((a, i) => (
            <div key={i} className="card">
              <p style={{ fontWeight: 500, marginBottom: 4 }}>{a.title}</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{a.description}</p>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>Ages: {a.ageRange}</span>
                <span>{a.duration}</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
