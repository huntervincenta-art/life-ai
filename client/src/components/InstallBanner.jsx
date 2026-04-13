import { useState, useEffect } from 'react';
import { Smartphone, X } from 'lucide-react';
import { requestPushPermission, subscribeToPush, registerServiceWorker } from '../services/pushManager';

const DISMISS_KEY = 'life-ai-install-dismissed';
const DISMISS_DAYS = 7;

function isDismissed() {
  const dismissed = localStorage.getItem(DISMISS_KEY);
  if (!dismissed) return false;
  const diff = Date.now() - parseInt(dismissed);
  return diff < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;
    setShow(true);

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS()) {
      setShowIOSInstructions(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === 'accepted') {
        // After install, try to enable push
        const permission = await requestPushPermission();
        if (permission === 'granted') {
          const reg = await registerServiceWorker();
          if (reg) await subscribeToPush(reg);
        }
        setShow(false);
      }
    } else {
      // No install prompt available — just ask for push permission
      const permission = await requestPushPermission();
      if (permission === 'granted') {
        const reg = await registerServiceWorker();
        if (reg) await subscribeToPush(reg);
      }
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="install-banner">
      {showIOSInstructions ? (
        <div className="install-banner-inner">
          <p className="install-ios-text">
            Tap the <strong>share button</strong> (square with arrow), then <strong>"Add to Home Screen"</strong>
          </p>
          <button className="btn btn-sm" onClick={handleDismiss}>Got it</button>
        </div>
      ) : (
        <div className="install-banner-inner">
          <Smartphone size={18} className="install-banner-icon" />
          <div className="install-banner-text">
            <strong>Install Life AI</strong>
            <span>Get bill alerts as push notifications</span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleInstall}>Install</button>
          <button className="install-banner-close" onClick={handleDismiss}><X size={14} /></button>
        </div>
      )}
    </div>
  );
}
