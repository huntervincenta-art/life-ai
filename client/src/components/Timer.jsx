import { useState, useEffect, useRef, useCallback } from 'react';

export default function Timer({ minutes = 5, onComplete }) {
  const totalSeconds = minutes * 60;
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
  }, []);

  useEffect(() => {
    if (!running) return;

    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          stop();
          if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [running, stop, onComplete]);

  function start() {
    if (remaining === 0) setRemaining(totalSeconds);
    setRunning(true);
  }

  function pause() {
    stop();
  }

  function reset() {
    stop();
    setRemaining(totalSeconds);
  }

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = ((totalSeconds - remaining) / totalSeconds) * 100;

  let timerClass = 'timer-display';
  let barColor = 'var(--accent-primary)';
  if (remaining <= 10 && remaining > 0) {
    timerClass += ' danger';
    barColor = 'var(--accent-danger)';
  } else if (remaining <= 60 && remaining > 0) {
    timerClass += ' warning';
    barColor = 'var(--accent-warning)';
  }

  return (
    <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
      <div className={timerClass}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>

      <div className="timer-progress">
        <div
          className="timer-progress-fill"
          style={{ width: `${progress}%`, backgroundColor: barColor }}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '16px' }}>
        {!running ? (
          <button className="btn btn-primary" onClick={start}>
            {remaining === 0 ? 'Restart' : remaining < totalSeconds ? 'Resume' : 'Start'}
          </button>
        ) : (
          <button className="btn btn-warning" onClick={pause}>Pause</button>
        )}
        <button className="btn btn-sm btn-ghost" onClick={reset}>Reset</button>
      </div>
    </div>
  );
}
