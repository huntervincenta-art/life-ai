import { useState, useEffect } from 'react';
import { life } from '../utils/api';
import { energyEmoji, moodEmoji } from '../utils/helpers';

const TOP_ACTIVITIES = ['Working', 'Cooking', 'Eating', 'Cleaning', 'Relaxing', 'Watching TV', 'Scrolling phone', 'Sleeping'];
const MORE_ACTIVITIES = ['Laundry', 'Dishes', 'Gaming', 'Reading', 'Exercising', 'Walking', 'Shopping', 'Driving', 'Showering', 'Creating content', 'Editing'];

const LOCATIONS = [
  { key: 'home', label: 'Home' },
  { key: 'work', label: 'Work' },
  { key: 'out', label: 'Out' },
  { key: 'commuting', label: 'Driving' },
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
  const [showMoreActivities, setShowMoreActivities] = useState(false);

  const [form, setForm] = useState({
    activity: '', location: 'home', people: [], energy: 3, mood: 3,
    hadMeal: false, mealType: null, choresCompleted: [], notes: '',
    isRoutine: false, routineFrequency: null, kidsPresent: false
  });

  useEffect(() => {
    life.getOnboarding()
      .then(setOnboarding)
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
      [field]: f[field].includes(value) ? f[field].filter(v => v !== value) : [...f[field], value]
    }));
  }

  if (loading) return <div className="center-msg">Loading...</div>;

  // Pre-gathering
  if (!onboarding || onboarding.phase === 'not_started') {
    return (
      <div className="page fade-in">
        <div className="page-header"><h1 className="page-title">Check-In</h1></div>
        <div className="focus-card">
          <div className="focus-card-emoji">📊</div>
          <div className="focus-card-title">Learn Your Patterns</div>
          <div className="focus-card-desc">Check in throughout the day for 7 days. Life AI will learn your routines and energy cycles.</div>
          <button className="btn btn-primary btn-lg" onClick={handleStart}>Start Data Gathering</button>
        </div>
      </div>
    );
  }

  // Pattern review
  if (onboarding.phase === 'pattern_review') {
    return (
      <div className="page fade-in">
        <div className="page-header"><h1 className="page-title">Check-In</h1></div>
        <div className="focus-card">
          <div className="focus-card-emoji">🎉</div>
          <div className="focus-card-title">Data Gathering Complete</div>
          <div className="focus-card-desc">{onboarding.totalCheckins} check-ins collected. Ready to analyze.</div>
          <button className="btn btn-primary btn-lg" onClick={handleGeneratePatterns}>Analyze My Patterns</button>
        </div>
      </div>
    );
  }

  // Success
  if (submitted) {
    return (
      <div className="page fade-in">
        <div className="page-header"><h1 className="page-title">Check-In</h1></div>
        <div className="focus-card">
          <div className="focus-card-emoji">✅</div>
          <div className="focus-card-title">Logged</div>
          {onboarding.phase === 'data_gathering' && (
            <div className="focus-card-desc">{onboarding.totalCheckins}/{onboarding.targetCheckins} check-ins</div>
          )}
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => {
            setSubmitted(false);
            setForm({ activity: '', location: 'home', people: [], energy: 3, mood: 3, hadMeal: false, mealType: null, choresCompleted: [], notes: '', isRoutine: false, routineFrequency: null, kidsPresent: false });
          }}>Log Another</button>
        </div>
      </div>
    );
  }

  const activities = showMoreActivities ? [...TOP_ACTIVITIES, ...MORE_ACTIVITIES] : TOP_ACTIVITIES;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">Check-In</h1>
        {onboarding.phase === 'data_gathering' && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{onboarding.totalCheckins}/{onboarding.targetCheckins}</span>
        )}
      </div>

      <div className="checkin-grid">

      <div className="section">
        <div className="section-title">What are you doing?</div>
        <div className="chip-group">
          {activities.map(a => (
            <button key={a} className={`chip${form.activity === a ? ' active' : ''}`} onClick={() => setForm(f => ({ ...f, activity: a }))}>{a}</button>
          ))}
          {!showMoreActivities && (
            <button className="chip" style={{ color: 'var(--accent-primary)' }} onClick={() => setShowMoreActivities(true)}>+ more</button>
          )}
        </div>
      </div>

      <div className="section">
        <div className="section-title">Where?</div>
        <div className="chip-group">
          {LOCATIONS.map(l => (
            <button key={l.key} className={`chip${form.location === l.key ? ' active' : ''}`} onClick={() => setForm(f => ({ ...f, location: l.key }))}>{l.label}</button>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-title">Who's with you?</div>
        <div className="chip-group">
          {PEOPLE.map(p => (
            <button key={p} className={`chip${form.people.includes(p) ? ' active' : ''}`} onClick={() => {
              toggleArrayItem('people', p);
              if (p === 'Kids') setForm(f => ({ ...f, kidsPresent: !f.kidsPresent }));
            }}>{p}</button>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-title">Energy</div>
        <div className="slider-group">
          {[1,2,3,4,5].map(n => (
            <button key={n} className={`slider-option${form.energy === n ? ' active' : ''}`} onClick={() => setForm(f => ({ ...f, energy: n }))}>
              {energyEmoji(n)}<span className="slider-label">{n}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-title">Mood</div>
        <div className="slider-group">
          {[1,2,3,4,5].map(n => (
            <button key={n} className={`slider-option${form.mood === n ? ' active' : ''}`} onClick={() => setForm(f => ({ ...f, mood: n }))}>
              {moodEmoji(n)}<span className="slider-label">{n}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-title">Meal?</div>
        <div className="chip-group">
          {MEAL_TYPES.map(m => (
            <button key={m.key || 'none'} className={`chip${form.mealType === m.key ? ' active' : ''}`} onClick={() => setForm(f => ({ ...f, mealType: m.key, hadMeal: m.key !== null }))}>{m.label}</button>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-title">Chores done?</div>
        <div className="chip-group">
          {CHORES.map(c => (
            <button key={c} className={`chip${form.choresCompleted.includes(c) ? ' active' : ''}`} onClick={() => toggleArrayItem('choresCompleted', c)}>{c}</button>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="flex-between">
          <div className="section-title" style={{ margin: 0 }}>Is this a routine?</div>
          <button className={`toggle${form.isRoutine ? ' active' : ''}`} onClick={() => setForm(f => ({ ...f, isRoutine: !f.isRoutine }))} />
        </div>
        {form.isRoutine && (
          <div className="chip-group" style={{ marginTop: 10 }}>
            {['daily', 'weekdays', 'weekends', 'weekly', 'biweekly'].map(freq => (
              <button key={freq} className={`chip${form.routineFrequency === freq ? ' active' : ''}`} onClick={() => setForm(f => ({ ...f, routineFrequency: freq }))}>{freq}</button>
            ))}
          </div>
        )}
      </div>

      <div className="form-group checkin-full">
        <label className="form-label">Notes (optional)</label>
        <textarea className="form-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Anything else..." />
      </div>

      </div>

      <div className="sticky-submit">
        <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Saving...' : 'Log Check-In'}
        </button>
      </div>
    </div>
  );
}
