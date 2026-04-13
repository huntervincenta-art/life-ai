import { useState } from 'react';
import { ChevronDown, ChevronUp, Award } from 'lucide-react';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function WeekBar({ daysThisWeek, message }) {
  const today = new Date().getDay();
  // Convert Sunday=0 to Monday-based index (Mon=0, Sun=6)
  const todayIdx = today === 0 ? 6 : today - 1;
  const great = daysThisWeek >= 5;

  return (
    <div className="progress-week">
      <div className="progress-week-bar">
        {DAY_LABELS.map((label, i) => {
          const isFuture = i > todayIdx;
          const isFilled = i < daysThisWeek;
          return (
            <div key={i} className="progress-week-segment">
              <div className={`progress-week-dot ${isFilled ? 'filled' : ''} ${isFuture ? 'future' : ''} ${great && isFilled ? 'great' : ''}`} />
              <span className="progress-week-label">{label}</span>
            </div>
          );
        })}
      </div>
      <div className="progress-week-text">
        <span>{great ? 'Great week!' : `This week: ${daysThisWeek} of 7 days`}</span>
      </div>
    </div>
  );
}

export default function ProgressHeader({ progress, onOpenBadges }) {
  const [showExplainer, setShowExplainer] = useState(false);

  if (!progress) return null;

  const { estimatedTaxSaved, weeklyProgress, level, xp, xpInCurrentLevel, xpToNextLevel } = progress;

  return (
    <div className="progress-header">
      {/* Hero: ADHD Tax Saved */}
      <div className="progress-hero">
        <div className="progress-hero-amount">${estimatedTaxSaved.toLocaleString()}</div>
        <div className="progress-hero-label">
          estimated ADHD tax saved
          <button
            className="progress-explainer-btn"
            onClick={(e) => { e.stopPropagation(); setShowExplainer(!showExplainer); }}
          >
            {showExplainer ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
        {showExplainer && (
          <div className="progress-explainer">
            Late fees avoided ($35 avg each) + savings from cancelled subscriptions
          </div>
        )}
      </div>

      {/* Weekly progress */}
      <WeekBar daysThisWeek={weeklyProgress.daysThisWeek} message={weeklyProgress.message} />

      {/* Level + XP */}
      <div className="progress-level-row">
        <button className="progress-level-badge" onClick={onOpenBadges}>
          <Award size={12} /> Level {level}
        </button>
        <div className="progress-xp-bar-wrap">
          <div className="progress-xp-bar">
            <div className="progress-xp-fill" style={{ width: `${(xpInCurrentLevel / 100) * 100}%` }} />
          </div>
          <span className="progress-xp-text">{xpInCurrentLevel} / 100 XP to Level {level + 1}</span>
        </div>
      </div>
    </div>
  );
}
