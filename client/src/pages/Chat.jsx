import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, Check, ArrowRight, MessageCircle } from 'lucide-react';
import { startChat, sendChatMessage, endChat, getActiveChat } from '../lib/api';

const ScorpioFace = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
    <circle cx="6.5" cy="7.5" r="1.2" fill="#111816" />
    <circle cx="11.5" cy="7.5" r="1.2" fill="#111816" />
    <path d="M6 11.5Q9 13.5 12 11.5" stroke="#111816" strokeWidth="1.2" strokeLinecap="round" fill="none" />
  </svg>
);

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function TypingIndicator() {
  return (
    <div className="chat-bubble chat-ai">
      <div className="chat-avatar"><ScorpioFace size={14} /></div>
      <div className="chat-bubble-content">
        <div className="typing-dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}

function BillConfirmCard({ bill }) {
  const cycle = bill.billingCycleDays === 30 ? '/mo' : bill.billingCycleDays === 90 ? '/qtr' : bill.billingCycleDays === 365 ? '/yr' : `/${bill.billingCycleDays}d`;
  const day = bill.dayOfMonth ? ` on the ${bill.dayOfMonth}${getOrdinal(bill.dayOfMonth)}` : '';
  return (
    <div className="chat-bill-confirm">
      <Check size={14} />
      <span>Added: {bill.vendor} — ${bill.amount?.toFixed(2)}{cycle}{day}</span>
    </div>
  );
}

function getOrdinal(n) {
  if (n > 3 && n < 21) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export default function ChatPage() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]); // { role, content, bill? }
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [billsTotal, setBillsTotal] = useState(0);
  const [timer, setTimer] = useState(20 * 60);
  const [ended, setEnded] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [showLanding, setShowLanding] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  // Check for active session — show landing if none
  useEffect(() => {
    (async () => {
      try {
        const active = await getActiveChat();
        if (active) {
          // Resume active session
          setSessionId(active.sessionId);
          setMessages(active.messages.map(m => ({ role: m.role, content: m.content })));
          setBillsTotal(active.billsExtracted || 0);
          setInitializing(false);
          return;
        }
        // No active session — show landing
        setShowLanding(true);
        setInitializing(false);
      } catch (err) {
        console.error('Failed to check chat:', err);
        setShowLanding(true);
        setInitializing(false);
      }
    })();
  }, []);

  const handleStartNew = async () => {
    setShowLanding(false);
    setInitializing(true);
    try {
      const data = await startChat();
      setSessionId(data.sessionId);
      setMessages(data.messages.map(m => ({ role: m.role, content: m.content })));
      setBillsTotal(data.billsExtracted || 0);
    } catch (err) {
      console.error('Failed to start chat:', err);
    } finally {
      setInitializing(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (ended || initializing) return;
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          setTimerExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [ended, initializing]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Auto-focus input
  useEffect(() => {
    if (!ended && !initializing) inputRef.current?.focus();
  }, [ended, initializing, messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !sessionId) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setSending(true);

    try {
      const data = await sendChatMessage(sessionId, text);
      const newMsg = { role: 'assistant', content: data.message };

      if (data.billExtracted && data.extractedBill) {
        newMsg.bill = data.extractedBill;
      }

      setMessages(prev => [...prev, newMsg]);
      setBillsTotal(data.billsTotal);
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Try sending that again.' }]);
    } finally {
      setSending(false);
    }
  }, [input, sending, sessionId]);

  const handleEnd = async () => {
    if (sessionId) {
      try {
        await endChat(sessionId);
      } catch {}
    }
    clearInterval(timerRef.current);
    setEnded(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const timerClass = timer <= 60 ? 'timer-danger' : timer <= 300 ? 'timer-warning' : '';

  if (initializing) {
    return (
      <div className="page" style={{ paddingTop: 60, textAlign: 'center' }}>
        <span className="spinner" />
        <p className="muted" style={{ marginTop: 12 }}>Loading...</p>
      </div>
    );
  }

  // Landing screen — no active session
  if (showLanding) {
    return (
      <div className="page" style={{ paddingTop: 40 }}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div className="scorpio-avatar" style={{ width: 64, height: 64, margin: '0 auto 16px' }}>
            <ScorpioFace size={32} />
          </div>
          <h2 style={{ marginBottom: 8 }}>I'm Scorpio</h2>
          <p className="muted" style={{ marginBottom: 24, fontSize: 14 }}>
            Let's map out your bills. It takes about 20 minutes — I'll keep it focused.
          </p>
          <button className="btn btn-primary btn-lg" onClick={handleStartNew} style={{ gap: 6 }}>
            <MessageCircle size={18} /> Start Chat
          </button>
        </div>
      </div>
    );
  }

  // Estimate monthly total from extracted bills
  const estimatedMonthly = messages
    .filter(m => m.bill)
    .reduce((sum, m) => {
      const amount = m.bill.amount || 0;
      const cycle = m.bill.billingCycleDays || 30;
      return sum + (amount * 30 / cycle);
    }, 0);

  if (ended) {
    return (
      <div className="chat-page">
        <div className="chat-summary">
          <div className="chat-summary-check">
            <Check size={32} />
          </div>
          <h2>Nice work!</h2>
          <p className="chat-summary-stat">
            You mapped out <strong>{billsTotal}</strong> bill{billsTotal !== 1 ? 's' : ''} totaling ~<strong>${estimatedMonthly.toFixed(0)}</strong>/month
          </p>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => navigate('/')}
            style={{ marginTop: 20 }}
          >
            View your timeline <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      {/* Top bar */}
      <div className="chat-topbar">
        <div className="chat-topbar-title">Scorpio</div>
        <div className={`chat-timer ${timerClass}`}>{formatTime(timer)}</div>
        <button className="chat-close" onClick={handleEnd}><X size={18} /></button>
      </div>

      {/* Timer expired banner */}
      {timerExpired && (
        <div className="chat-timer-banner">
          Time's up! Keep going or tap X to finish.
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i}>
            {m.role === 'assistant' ? (
              <div className="chat-bubble chat-ai">
                <div className="chat-avatar"><ScorpioFace size={14} /></div>
                <div className="chat-bubble-content">{m.content}</div>
              </div>
            ) : (
              <div className="chat-bubble chat-user">
                <div className="chat-bubble-content">{m.content}</div>
              </div>
            )}
            {m.bill && <BillConfirmCard bill={m.bill} />}
          </div>
        ))}
        {sending && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <input
          ref={inputRef}
          className="chat-input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type here..."
          disabled={sending}
        />
        <button
          className="chat-send"
          onClick={handleSend}
          disabled={!input.trim() || sending}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
