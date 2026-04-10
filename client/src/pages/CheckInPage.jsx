import { useState, useEffect } from 'react';
import { life } from '../utils/api';
import { energyEmoji, moodEmoji } from '../utils/helpers';

const ACTIVITIES = [
  'Working', 'Cooking', 'Eating', 'Cleaning', 'Laundry', 'Dishes',
  'Relaxing', 'Watching TV', 'Gaming', 'Reading', 'Scrolling phone',
  'Exercising', 'Walking', 'Shopping', 'Driving', 'Showering',
  'Creating content', 'Editing', 'Sleeping'
];

const LOCATIONS = [
  { key: 'home', label: 'Home' },
  { key: 'work', label: 'Work' },
  { key: 'out', label: 'Out' },
  { key: 'commuting', label: 'Commuting' },
  { key: 'other', label: 'Other' }
];

const PEOPLE = ['Alone', 'Holle', 'Kids', 'Friends', 'Coworkers', 'Family'];

const CHORES = ['Dishes', 'Laundry', 'Vacuuming', 'Cooking', 'Trash', 'Tidying', 'Wiping counters'];

const MEAL_TYPES = [
  { key: null, label: 'None' },
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' }
];

export default function CheckInPage() {
  const [onboarding, setOnboarding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    activity: '',
    location: 'home',
    people: [],
    energy: 3,
    mood: 3,
    hadMeal: false,
    mealType: null,
    choresCompleted: [],
    notes: '',
    isRoutine: false,
    routineFrequency: null,
    kidsPresent: false
  });

  useEffect(() => {
    life.getOnboarding()
      .then(data => setOnboarding(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleStart() {
    const data = await life.startOnboarding();
    setOnboarding(data);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await life.checkin(form);
      setSubmitted(true);
      // Refresh onboarding state
      const updated = await life.getOnboarding();
      setOnboarding(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGeneratePatterns() {
    await life.generatePatterns();
    const updated = await life.getOnboarding();
    setOnboarding(updated);
  }

  function toggleArrayItem(field, value) {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter(v => v !== value)
        : [...f[field], value]
    }));
  }

  if (loading) return <div className="center-msg">Loading...</div>;

  // Pre-gathering state
  if (!onboarding || onboarding.phase === 'not_started') {
    return (
      <div className="page fade-in">
        <div className="page-header">
          <h1 className="page-title">Check-In</h1>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <p style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Learn Your Patterns</p>
          <p className="muted mb-16">
            Start a 7-day data gathering phase. Check in throughout the day so Life AI can learn your routines, energy cycles, and schedule.
          </p>
          <button className="btn btn-primary btn-lg" onClick={handleStart}>
            Start 7-Day Data Gathering
          </button>
        </div>
      </div>
    );
  }

  // Pattern review state
  if (onboarding.phase === 'pattern_review') {
    return (
      <div className="page fade-in">
        <div className="page-header">
          <h1 className="page-title">Check-In</h1>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <p style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Data Gathering Complete!</p>
          <p className="muted mb-16">
            {onboarding.totalCheckins} check-ins collected. Ready to analyze your patterns.
          </p>
          <button className="btn btn-primary btn-lg" onClick={handleGeneratePatterns}>
            Analyze My Patterns
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="page fade-in">
        <div className="page-header">
          <h1 className="page-title">Check-In</h1>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <p style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Logged!</p>
          {onboarding.phase === 'data_gathering' && (
            <p className="muted">{onboarding.totalCheckins} / {onboarding.targetCheckins} check-ins</p>
          )}
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => {
            setSubmitted(false);
            setForm({ activity: '', location: 'home', people: [], energy: 3, mood: 3, hadMeal: false, mealType: null, choresCompleted: [], notes: '', isRoutine: false, routineFrequency: null, kidsPresent: false });
          }}>
            Log Another
          </button>
        </div>
      </div>
    );
  }

  // Active form
  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">Check-In</h1>
        {onboarding.phase === 'data_gathering' && (
          <span className="muted" style={{ fontSize: 12 }}>{onboarding.totalCheckins}/{onboarding.targetCheckins}</span>
        )}
      </div>

      {/* Activity */}
      <div className="section">
        <p className="section-title">What are you doing?</p>
        <div className="chip-group">
          {ACTIVITIES.map(a => (
            <button key={a} className={`chip${form.activity === a ? ' active' : ''}`} onClick={() => setForm(f => ({ ...f, activity: a }))}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="section">
        <p className="section-title">Where?</p>
        <div className="chip-group">
          {LOCATIONS.map(l => (
            <button key={l.key} className={`chip${form.location === l.key ? ' active' : ''}`} onClick={() => setForm(f => ({ ...f, location: l.key }))}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* People */}
      <div className="section">
        <p className="section-title">Who's with you?</p>
        <div className="chip-group">
          {PEOPLE.map(p => (
            <button key={p} className={`chip${form.people.includes(p) ? ' active' : ''}`} onClick={() => {
              toggleArrayItem('people', p);
              if (p === 'Kids') setForm(f => ({ ...f, kidsPresent: !f.kidsPresent }));
            }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Energy */}
      <div className="section">
        <p className="section-title">Energy Level</p>
        <div className="slider-group">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} className={`slider-option${form.energy === n ? ' active' : ''}`} onClick={() => setForm(f => ({ ...f, energy: n }))}>
              {energyEmoji(n)}
              <span className="slider-label">{n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mood */}
      <div className="section">
        <p className="section-title">Mood</p>
        <div className="slider-group">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} className={`slider-option${form.mood === n ? ' active' : ''}`} onClick={() => setForm(f => ({ ...f, mood: n }))}>
              {moodEmoji(n)}
              <span className="slider-label">{n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Meal */}
      <div className="section">
        <p className="section-title">Meal?</p>
        <div className="chip-group">
          {MEAL_TYPES.map(m => (
            <button key={m.key || 'none'} className={`chip${form.mealType === m.key ? ' active' : ''}`} onClick={() => setForm(f => ({ ...f, mealType: m.key, hadMeal: m.key !== null }))}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chores */}
      <div className="section">
        <p className="section-title">Chores Done?</p>
        <div className="chip-group">
          {CHORES.map(c => (
            <button key={c} className={`chip${form.choresCompleted.includes(c) ? ' active' : ''}`} onClick={() => toggleArrayItem('choresCompleted', c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Routine toggle */}
      <div className="section">
        <div className="flex-between">
          <p className="section-title" style={{ margin: 0 }}>Is this a routine?</p>
          <button className={`toggle${form.isRoutine ? ' active' : ''}`} onClick={() => setForm(f => ({ ...f, isRoutine: !f.isRoutine }))} />
        </div>
        {form.isRoutine && (
          <div className="chip-group" style={{ marginTop: 10 }}>
            {['daily', 'weekdays', 'weekends', 'weekly', 'biweekly'].map(freq => (
              <button key={freq} className={`chip${form.routineFrequency === freq ? ' active' : ''}`} onClick={() => setForm(f => ({ ...f, routineFrequency: freq }))}>
                {freq}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="form-group">
        <label className="form-label">Notes (optional)</label>
        <textarea className="form-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Anything else..." />
      </div>

      <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Saving...' : 'Log Check-In'}
      </button>
    </div>
  );
}
