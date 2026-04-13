import { useState } from 'react';
import { Bell } from 'lucide-react';
import { requestPushPermission, subscribeToPush, registerServiceWorker } from '../services/pushManager';

export default function PushPrompt({ onDone }) {
  const [enabling, setEnabling] = useState(false);

  const handleEnable = async () => {
    setEnabling(true);
    try {
      const permission = await requestPushPermission();
      if (permission === 'granted') {
        const reg = await registerServiceWorker();
        if (reg) await subscribeToPush(reg);
      }
    } catch (err) {
      console.error('Push enable failed:', err);
    } finally {
      setEnabling(false);
      onDone();
    }
  };

  return (
    <div className="modal-overlay" onClick={onDone}>
      <div className="push-prompt" onClick={e => e.stopPropagation()}>
        <div className="push-prompt-icon"><Bell size={28} /></div>
        <h3>Allow bill alerts?</h3>
        <p>We'll notify you a few days before bills are due so nothing sneaks up on you.</p>
        <div className="push-prompt-actions">
          <button className="btn btn-primary" onClick={handleEnable} disabled={enabling}>
            {enabling ? <span className="spinner" /> : 'Enable notifications'}
          </button>
          <button className="btn btn-ghost" onClick={onDone}>Maybe later</button>
        </div>
      </div>
    </div>
  );
}
