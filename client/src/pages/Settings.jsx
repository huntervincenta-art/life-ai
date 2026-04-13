import { useState, useEffect } from 'react';
import { RefreshCw, Bell, Smartphone } from 'lucide-react';
import { format } from 'date-fns';
import { getSettings, updateSettings, saveGmailCredentials, triggerScan, getVendors, updateVendor, testPush, getProgress } from '../lib/api';
import { checkPushPermission, requestPushPermission, registerServiceWorker, subscribeToPush } from '../services/pushManager';

function isStandalonePWA() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [gmailForm, setGmailForm] = useState({ gmailUser: '', gmailAppPassword: '' });
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [savingGmail, setSavingGmail] = useState(false);
  const [gmailMsg, setGmailMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedVendor, setExpandedVendor] = useState(null); // { id, type: 'pay' | 'cancel' }
  const [progress, setProgress] = useState(null);
  const [pushStatus, setPushStatus] = useState('loading');
  const [testResult, setTestResult] = useState(null);
  const [enablingPush, setEnablingPush] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSTip, setShowIOSTip] = useState(false);

  // Capture beforeinstallprompt
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [s, v, prog] = await Promise.all([getSettings(), getVendors(), getProgress()]);
        setSettings(s);
        setVendors(v);
        setGmailForm({ gmailUser: s.gmailUser || '', gmailAppPassword: '' });
        setProgress(prog);

        const perm = await checkPushPermission();
        setPushStatus(perm);

        setIsInstalled(isStandalonePWA());
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const result = await triggerScan();
      setScanResult(result);
      const s = await getSettings();
      setSettings(s);
    } catch (err) {
      setScanResult({ error: err.message });
    } finally {
      setScanning(false);
    }
  };

  const handleSaveGmail = async () => {
    if (!gmailForm.gmailUser || !gmailForm.gmailAppPassword) return;
    setSavingGmail(true);
    setGmailMsg('');
    try {
      const result = await saveGmailCredentials(gmailForm);
      setGmailMsg(result.message || 'Connected!');
      setSettings(prev => ({ ...prev, gmailConnected: true, gmailUser: gmailForm.gmailUser }));
      setGmailForm(prev => ({ ...prev, gmailAppPassword: '' }));
    } catch (err) {
      setGmailMsg(err.response?.data?.error || 'Connection failed');
    } finally {
      setSavingGmail(false);
    }
  };

  const handleUpdateSetting = async (key, value) => {
    try {
      await updateSettings({ [key]: value });
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (err) {
      console.error('Failed to update setting:', err);
    }
  };

  const handleToggleVendor = async (vendor) => {
    try {
      await updateVendor(vendor._id, { isActive: !vendor.isActive });
      setVendors(prev => prev.map(v => v._id === vendor._id ? { ...v, isActive: !v.isActive } : v));
    } catch (err) {
      console.error('Failed to toggle vendor:', err);
    }
  };

  const handleEnablePush = async () => {
    setEnablingPush(true);
    try {
      const permission = await requestPushPermission();
      if (permission === 'granted') {
        const reg = await registerServiceWorker();
        if (reg) await subscribeToPush(reg);
        setPushStatus('granted');
      } else {
        setPushStatus(permission);
      }
    } catch (err) {
      console.error('Push enable failed:', err);
    } finally {
      setEnablingPush(false);
    }
  };

  const handleTestPush = async () => {
    setTestResult(null);
    try {
      const result = await testPush();
      setTestResult(`Sent to ${result.sent} device${result.sent !== 1 ? 's' : ''}`);
    } catch (err) {
      setTestResult('Failed to send');
    }
  };

  if (loading) {
    return <div className="page text-center" style={{ paddingTop: 60 }}><span className="spinner" /></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      {/* App */}
      <div className="settings-section">
        <div className="settings-section-title">App</div>
        <div className="settings-row">
          <span className="settings-label">Installation</span>
          {isInstalled ? (
            <span className="settings-value"><span className="status-dot connected" /> Installed</span>
          ) : (
            <button className="btn btn-primary btn-sm" style={{ gap: 4 }} onClick={async () => {
              if (isIOSDevice()) { setShowIOSTip(true); return; }
              if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                setDeferredPrompt(null);
                if (outcome === 'accepted') setIsInstalled(true);
              }
            }}>
              <Smartphone size={12} /> Install
            </button>
          )}
        </div>
        {showIOSTip && (
          <div className="muted" style={{ padding: '6px 0' }}>
            Tap the share button, then "Add to Home Screen"
          </div>
        )}
      </div>

      {/* Your Progress */}
      {progress && (
        <div className="settings-section">
          <div className="settings-section-title">Your Progress</div>
          <div className="settings-row">
            <span className="settings-label">Level</span>
            <span className="settings-value" style={{ color: 'var(--accent-secondary)' }}>Level {progress.level}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Bills tracked</span>
            <span className="settings-value">{progress.totalBillsTracked}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Subscriptions cancelled</span>
            <span className="settings-value">{progress.cancelledSubscriptions}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Estimated savings</span>
            <span className="settings-value" style={{ color: 'var(--accent-success)' }}>${progress.estimatedTaxSaved.toLocaleString()}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">30-day consistency</span>
            <span className="settings-value">{progress.consistencyRate}%</span>
          </div>
          {progress.badges.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div className="form-label" style={{ marginBottom: 6 }}>Badges earned</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {progress.badges.map(b => (
                  <span key={b.id} className="badge" style={{ background: 'var(--accent-secondary-light)', color: 'var(--accent-secondary)' }}>
                    {b.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notifications */}
      <div className="settings-section">
        <div className="settings-section-title">Notifications</div>

        <div className="settings-row">
          <span className="settings-label">Push notifications</span>
          <span className="settings-value">
            {pushStatus === 'granted' ? (
              <><span className="status-dot connected" /> Enabled</>
            ) : pushStatus === 'denied' ? (
              <><span className="status-dot disconnected" /> Blocked</>
            ) : pushStatus === 'unsupported' ? (
              <span style={{ color: 'var(--text-muted)' }}>Not supported</span>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Not set up</span>
            )}
          </span>
        </div>

        {pushStatus === 'default' && (
          <div style={{ marginTop: 8 }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleEnablePush}
              disabled={enablingPush}
              style={{ gap: 4 }}
            >
              {enablingPush ? <span className="spinner" /> : <Bell size={12} />}
              Enable Push Notifications
            </button>
          </div>
        )}

        {pushStatus === 'denied' && (
          <div className="muted" style={{ marginTop: 6 }}>
            Notifications are blocked. Enable them in your browser/device settings for this site.
          </div>
        )}

        {pushStatus === 'granted' && (
          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-sm" onClick={handleTestPush} style={{ gap: 4 }}>
              <Bell size={12} /> Send Test
            </button>
            {testResult && <span className="muted">{testResult}</span>}
          </div>
        )}

        <div className="settings-row" style={{ marginTop: 8 }}>
          <span className="settings-label">Alert days before bill</span>
          <input
            className="form-input"
            type="number"
            min="1"
            max="14"
            value={settings.alertDaysBefore}
            onChange={e => handleUpdateSetting('alertDaysBefore', parseInt(e.target.value))}
            style={{ width: 60, textAlign: 'center' }}
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">Bill alerts</span>
          <button
            className={`toggle ${settings.pushEnabled ? 'active' : ''}`}
            onClick={() => handleUpdateSetting('pushEnabled', !settings.pushEnabled)}
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">Auto-scanning</span>
          <button
            className={`toggle ${settings.scanEnabled ? 'active' : ''}`}
            onClick={() => handleUpdateSetting('scanEnabled', !settings.scanEnabled)}
          />
        </div>
      </div>

      {/* Gmail Connection */}
      <div className="settings-section">
        <div className="settings-section-title">Gmail Connection</div>

        <div className="settings-row">
          <span className="settings-label">Status</span>
          <span className="settings-value">
            <span className={`status-dot ${settings.gmailConnected ? 'connected' : 'disconnected'}`} />
            {settings.gmailConnected ? 'Connected' : 'Not connected'}
          </span>
        </div>

        {settings.gmailUser && (
          <div className="settings-row">
            <span className="settings-label">Gmail</span>
            <span className="settings-value">{settings.gmailUser}</span>
          </div>
        )}

        {settings.lastScanAt && (
          <div className="settings-row">
            <span className="settings-label">Last Scan</span>
            <span className="settings-value">{format(new Date(settings.lastScanAt), 'MMM d, h:mm a')}</span>
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleScan}
            disabled={scanning}
            style={{ gap: 6 }}
          >
            {scanning ? <span className="spinner" /> : <RefreshCw size={14} />}
            {scanning ? 'Scanning...' : 'Scan Now'}
          </button>
        </div>

        {scanResult && (
          <div className="muted" style={{ marginTop: 8 }}>
            {scanResult.error
              ? `Error: ${scanResult.error}`
              : `Scanned ${scanResult.emailsScanned} emails, found ${scanResult.billsExtracted} bills, ${scanResult.newBills} new`
            }
          </div>
        )}

        {!settings.gmailConnected && (
          <div style={{ marginTop: 16, borderTop: `1px solid var(--border)`, paddingTop: 14 }}>
            <div className="form-group">
              <label className="form-label">Gmail Address</label>
              <input
                className="form-input"
                type="email"
                value={gmailForm.gmailUser}
                onChange={e => setGmailForm(prev => ({ ...prev, gmailUser: e.target.value }))}
                placeholder="you@gmail.com"
              />
            </div>
            <div className="form-group">
              <label className="form-label">App Password</label>
              <input
                className="form-input"
                type="password"
                value={gmailForm.gmailAppPassword}
                onChange={e => setGmailForm(prev => ({ ...prev, gmailAppPassword: e.target.value }))}
                placeholder="16-character app password"
              />
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSaveGmail}
              disabled={savingGmail || !gmailForm.gmailUser || !gmailForm.gmailAppPassword}
            >
              {savingGmail ? <span className="spinner" /> : 'Connect Gmail'}
            </button>
            {gmailMsg && <div className="muted" style={{ marginTop: 6 }}>{gmailMsg}</div>}
          </div>
        )}
      </div>

      {/* Vendors */}
      {vendors.length > 0 && (
        <div className="settings-section">
          <div className="settings-section-title">Detected Vendors ({vendors.length})</div>

          {vendors.map(v => {
            const isPayExpanded = expandedVendor?.id === v._id && expandedVendor?.type === 'pay';
            const isCancelExpanded = expandedVendor?.id === v._id && expandedVendor?.type === 'cancel';
            return (
              <div key={v._id} className={`vendor-item ${!v.isActive ? 'vendor-cancelled' : ''}`} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="vendor-info">
                    <div className="vendor-name">
                      {v.name}
                      {!v.isActive && <span className="badge-cancelled">Cancelled</span>}
                    </div>
                    <div className="vendor-detail">
                      {v.category} &middot; {v.billingCycleDays}d cycle &middot; ${v.lastAmount?.toFixed(2) || '—'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      {(v.payMethod || v.payUrl) && (
                        <button
                          className="vendor-cancel-link"
                          style={{ color: '#5ba88a' }}
                          onClick={e => { e.stopPropagation(); setExpandedVendor(isPayExpanded ? null : { id: v._id, type: 'pay' }); }}
                        >
                          {isPayExpanded ? 'hide pay info' : 'pay'}
                        </button>
                      )}
                      {(v.cancelMethod || v.cancelUrl) && (
                        <button
                          className="vendor-cancel-link"
                          onClick={e => { e.stopPropagation(); setExpandedVendor(isCancelExpanded ? null : { id: v._id, type: 'cancel' }); }}
                        >
                          {isCancelExpanded ? 'hide cancel info' : 'cancel'}
                        </button>
                      )}
                      {v.cancelDifficulty && (
                        <span className={`difficulty-badge difficulty-${v.cancelDifficulty}`}>{v.cancelDifficulty}</span>
                      )}
                    </div>
                  </div>
                  <button
                    className={`toggle ${v.isActive ? 'active' : ''}`}
                    onClick={() => handleToggleVendor(v)}
                    style={{ flexShrink: 0 }}
                  />
                </div>
                {isPayExpanded && (
                  <div className="cancel-inline" style={{ marginTop: 6, borderLeftColor: '#5ba88a' }}>
                    {v.payMethod && <div className="pay-method">{v.payMethod}</div>}
                    {v.payTip && <div className="pay-tip">{v.payTip}</div>}
                    {v.payUrl && (
                      <a href={v.payUrl} target="_blank" rel="noopener noreferrer"
                        className="action-btn action-btn-pay" style={{ marginTop: 4 }}>
                        Pay Now
                      </a>
                    )}
                  </div>
                )}
                {isCancelExpanded && (
                  <div className="cancel-inline" style={{ marginTop: 6 }}>
                    {v.cancelMethod && <div className="cancel-method">{v.cancelMethod}</div>}
                    {v.cancelTip && <div className="cancel-tip">{v.cancelTip}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
