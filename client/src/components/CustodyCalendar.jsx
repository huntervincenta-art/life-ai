import { useState, useEffect } from 'react';
import { life } from '../utils/api';

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CustodyCalendar() {
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    life.getCustody(4)
      .then(data => setWeeks(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || weeks.length === 0) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="custody-calendar">
      <p className="section-title">Custody Schedule</p>

      {/* Day-of-week header */}
      <div className="custody-week" style={{ marginBottom: 2 }}>
        {DAY_ABBR.map(d => (
          <div key={d} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {d}
          </div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi}>
          <div className="custody-week-label">
            {week.isMyWeekend ? `Week ${week.weekNumber} — My weekend` : `Week ${week.weekNumber} — Mom's weekend`}
          </div>
          <div className="custody-week">
            {week.days.map((day, di) => {
              let cls = 'custody-day';
              if (day.isWeekendCustody) cls += ' has-kids-weekend';
              else if (day.isWeekdayAfternoon) cls += ' has-kids-weekday';
              else if (day.isMomsWeekend) cls += ' moms-weekend';
              if (day.date === todayStr) cls += ' is-today';

              const dateNum = new Date(day.date + 'T12:00:00').getDate();

              return (
                <div key={di} className={cls}>
                  <span className="custody-day-num">{dateNum}</span>
                  {day.hasKids && (
                    <span className="custody-day-hours">{day.custodyHours}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'rgba(92,224,216,0.3)', marginRight: 4, verticalAlign: 'middle' }}></span>My weekend</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'rgba(92,224,216,0.12)', marginRight: 4, verticalAlign: 'middle' }}></span>Mon/Wed PM</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'var(--bg-surface2)', marginRight: 4, verticalAlign: 'middle', opacity: 0.5 }}></span>Mom's</span>
      </div>
    </div>
  );
}
