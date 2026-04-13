import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, Bot, Check, ArrowRight } from 'lucide-react';
import { startChat, sendChatMessage, endChat } from '../lib/api';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function TypingIndicator() {
  return (
    <div className="chat-bubble chat-ai">
      <div className="chat-avatar"><Bot size={14} /></div>
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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  // Start or resume session
  useEffect(() => {
    (async () => {
      try {
        const data = await startChat();
        setSessionId(data.sessionId);
        setMessages(data.messages.map(m => ({ role: m.role, content: m.content })));
        setBillsTotal(data.billsExtracted || 0);

        // If resumed, adjust timer based on startedAt
        if (data.resumed && data.messages.length > 0) {
          const firstMsg = data.messages[0];
          const elapsed = Math.floor((Date.now() - new Date(firstMsg.timestamp).getTime()) / 1000);
          const remaining = Math.max(0, 20 * 60 - elapsed);
          setTimer(remaining);
          if (remaining === 0) setTimerExpired(true);
        }
      } catch (err) {
        console.error('Failed to start chat:', err);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

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
      <div className="chat-page">
        <div className="chat-loading">
          <span className="spinner" />
          <p className="muted" style={{ marginTop: 12 }}>Starting your chat...</p>
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
        <div className="chat-topbar-title">Get To Know You</div>
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
                <div className="chat-avatar"><Bot size={14} /></div>
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
