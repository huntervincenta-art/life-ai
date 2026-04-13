import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { getSettings, updateSettings, saveGmailCredentials, triggerScan, getVendors, updateVendor } from '../lib/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [gmailForm, setGmailForm] = useState({ gmailUser: '', gmailAppPassword: '' });
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [savingGmail, setSavingGmail] = useState(false);
  const [gmailMsg, setGmailMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, v] = await Promise.all([getSettings(), getVendors()]);
        setSettings(s);
        setVendors(v);
        setGmailForm({ gmailUser: s.gmailUser || '', gmailAppPassword: '' });
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
      // Refresh settings to get updated lastScanAt
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

  if (loading) {
    return <div className="page text-center" style={{ paddingTop: 60 }}><span className="spinner" /></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
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

      {/* Alert Preferences */}
      <div className="settings-section">
        <div className="settings-section-title">Alert Preferences</div>

        <div className="settings-row">
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
          <span className="settings-label">ntfy Topic</span>
          <input
            className="form-input"
            type="text"
            value={settings.ntfyTopic}
            onChange={e => handleUpdateSetting('ntfyTopic', e.target.value)}
            style={{ width: 140, textAlign: 'right' }}
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

      {/* Vendors */}
      {vendors.length > 0 && (
        <div className="settings-section">
          <div className="settings-section-title">Detected Vendors ({vendors.length})</div>

          {vendors.map(v => (
            <div key={v._id} className="vendor-item">
              <div className="vendor-info">
                <div className="vendor-name">{v.name}</div>
                <div className="vendor-detail">
                  {v.category} &middot; {v.billingCycleDays}d cycle &middot; ${v.lastAmount?.toFixed(2) || '—'}
                </div>
              </div>
              <button
                className={`toggle ${v.isActive ? 'active' : ''}`}
                onClick={() => handleToggleVendor(v)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
