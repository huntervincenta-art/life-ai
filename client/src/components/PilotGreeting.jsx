import { useState, useEffect } from 'react';

const PILOT_FACE = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="6.5" cy="7.5" r="1.2" fill="#111816" />
    <circle cx="11.5" cy="7.5" r="1.2" fill="#111816" />
    <path d="M6 11.5Q9 13.5 12 11.5" stroke="#111816" strokeWidth="1.2" strokeLinecap="round" fill="none" />
  </svg>
);

const MORNING_GREETINGS = [
  "Good morning! Here's your bill snapshot",
  "Hey! Quick look at what's ahead",
  "Morning — let's check in on your week",
];

const AFTERNOON_GREETINGS = [
  "Good afternoon! Here's your bill snapshot",
  "Hey! Quick look at what's ahead",
  "Let's check in — here's your week",
];

const EVENING_GREETINGS = [
  "Good evening! Here's your bill snapshot",
  "Hey! Quick look at what's ahead",
  "Evening — here's where things stand",
];

const WELCOME_BACK = [
  "Hey, welcome back! Your bills didn't go anywhere",
  "You're back! Let's see what's coming up",
  "Missed you! Here's where things stand",
  "Welcome back — zero judgment, just your bills",
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export default function PilotGreeting({ lastOpenedAt }) {
  const [message, setMessage] = useState('');

  useEffect(() => {
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    const isReturning = lastOpenedAt && (Date.now() - new Date(lastOpenedAt).getTime()) > twoDaysMs;

    if (isReturning) {
      setMessage(pickRandom(WELCOME_BACK));
    } else {
      const tod = getTimeOfDay();
      if (tod === 'morning') setMessage(pickRandom(MORNING_GREETINGS));
      else if (tod === 'afternoon') setMessage(pickRandom(AFTERNOON_GREETINGS));
      else setMessage(pickRandom(EVENING_GREETINGS));
    }
  }, [lastOpenedAt]);

  if (!message) return null;

  return (
    <div className="pilot-greeting">
      <div className="pilot-avatar">{PILOT_FACE}</div>
      <span className="pilot-message">{message}</span>
    </div>
  );
}
