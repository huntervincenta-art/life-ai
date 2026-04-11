import { useState, useEffect, useCallback } from 'react';
import { routines } from '../utils/api';
import Timer from '../components/Timer';
import BionicText from '../components/BionicText';

export default function RoutinesPage() {
  const [view, setView] = useState('today');
  const [tasks, setTasks] = useState([]);
  const [kidActivities, setKidActivities] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timerTask, setTimerTask] = useState(null);
  const [expandedTip, setExpandedTip] = useState(null);

  const load = useCallback(async () => {
    try { setTasks(await routines.list()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = new Date().getDay();
  const todayTasks = tasks.filter(t => t.isActive && t.preferredTime?.daysOfWeek?.includes(today));
  const isDone = (t) => t.lastCompleted && new Date(t.lastCompleted).toDateString() === new Date().toDateString();

  async function handleComplete(id) {
    const updated = await routines.complete(id);
    setTasks(prev => prev.map(t => t._id === id ? updated : t));
    if (timerTask?._id === id) setTimerTask(null);
  }

  async function handleSkip(id) {
    const updated = await routines.skip(id);
    setTasks(prev => prev.map(t => t._id === id ? updated : t));
  }

  async function loadKids() {
    try {
      const data = await routines.getKidSuggestions();
      setKidActivities(data);
      setView('kids');
    } catch (e) { console.error(e); }
  }

  if (loading) return <div className="center-msg">Loading...</div>;

  // Timer view
  if (timerTask) {
    return (
      <div className="page fade-in">
        <div className="page-header">
          <h1 className="page-title">{timerTask.name}</h1>
          <button className="btn-sm btn-ghost" onClick={() => setTimerTask(null)}>Close</button>
        </div>
        <div className="routines-timer-layout">
          <div>
            <Timer minutes={timerTask.timerMinutes || 10} onComplete={() => handleComplete(timerTask._id)} />
            <button className="btn btn-success btn-lg" style={{ marginTop: 16 }} onClick={() => handleComplete(timerTask._id)}>Done!</button>
          </div>
          {timerTask.adhdStrategy && (
            <div style={{ padding: 16, borderLeft: '2px solid var(--border)' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Strategy</p>
              <BionicText as="p" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{timerTask.adhdStrategy}</BionicText>
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
        <div style={{ display: 'flex', gap: 6 }}>
          {view !== 'today' && <button className="btn-sm btn-ghost" onClick={() => setView('today')}>Today</button>}
          {view !== 'all' && <button className="btn-sm btn-ghost" onClick={() => setView('all')}>All</button>}
          <button className="btn-sm btn-ghost" onClick={loadKids}>Kids</button>
        </div>
      </div>

      {/* Today */}
      {view === 'today' && (
        <div className="section">
          {todayTasks.length === 0 ? (
            <div className="empty-state">
              <p>Nothing scheduled today.</p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={async () => { await routines.seedDefaults(); load(); }}>
                Seed Default Routines
              </button>
            </div>
          ) : (
            todayTasks.map(task => {
              const done = isDone(task);
              return (
                <div key={task._id} className="list-item" style={{ opacity: done ? 0.4 : 1, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, color: done ? 'var(--accent-green)' : 'var(--text-muted)', width: 20 }}>
                    {done ? '✓' : '○'}
                  </span>
                  <div className="list-item-body">
                    <span className="list-item-title">{task.name}</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>~{task.estimatedMinutes || '?'}m</span>
                  {task.streak > 0 && <span className="streak">🔥{task.streak}</span>}

                  {!done && (
                    <div style={{ width: '100%', display: 'flex', gap: 6, marginTop: 6, paddingLeft: 30 }}>
                      <button className="btn btn-success" style={{ flex: 1 }} onClick={() => handleComplete(task._id)}>Done</button>
                      <button className="btn-sm btn-ghost" onClick={() => handleSkip(task._id)}>Skip</button>
                      {task.timerEnabled && <button className="btn-sm" style={{ borderColor: 'var(--accent)' , color: 'var(--accent)' }} onClick={() => setTimerTask(task)}>Timer</button>}
                    </div>
                  )}

                  {!done && task.adhdStrategy && (
                    <div style={{ width: '100%', paddingLeft: 30, marginTop: 4 }}>
                      <div className="inline-tip" onClick={() => setExpandedTip(expandedTip === task._id ? null : task._id)}>
                        {expandedTip === task._id
                          ? <BionicText>{task.adhdStrategy}</BionicText>
                          : '💡 Show tip'}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* All */}
      {view === 'all' && (
        <div className="section">
          {tasks.map(task => (
            <div key={task._id} className="list-item">
              <div className="list-item-body">
                <span className="list-item-title">{task.name}</span>
                <span className="list-item-meta" style={{ marginLeft: 8 }}>{task.category}</span>
              </div>
              {task.streak > 0 && <span className="streak">🔥{task.streak}</span>}
              <span className="list-item-meta">
                {task.preferredTime?.daysOfWeek?.map(d => ['Su','Mo','Tu','We','Th','Fr','Sa'][d]).join(',')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Kids */}
      {view === 'kids' && kidActivities && (
        <div className="section">
          <div className="section-label">Activity ideas</div>
          {kidActivities.rose && (
            <div className="list-item">
              <span className="list-item-emoji">🎨</span>
              <div className="list-item-body">
                <div className="list-item-title">Rose: {kidActivities.rose.title}</div>
                <BionicText as="div" className="list-item-meta">{kidActivities.rose.desc}</BionicText>
              </div>
            </div>
          )}
          {kidActivities.will && (
            <div className="list-item">
              <span className="list-item-emoji">🏎️</span>
              <div className="list-item-body">
                <div className="list-item-title">Will: {kidActivities.will.title}</div>
                <BionicText as="div" className="list-item-meta">{kidActivities.will.desc}</BionicText>
              </div>
            </div>
          )}
          <button className="btn-link" style={{ marginTop: 8 }} onClick={loadKids}>↻ Shuffle</button>
        </div>
      )}
    </div>
  );
}
