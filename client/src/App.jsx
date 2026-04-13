import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import BottomNav from './components/BottomNav';
import AddBillModal from './components/AddBillModal';
import Timeline from './pages/Timeline';
import History from './pages/History';
import Settings from './pages/Settings';
import Chat from './pages/Chat';
import { registerServiceWorker, subscribeToPush, checkPushPermission } from './services/pushManager';

// Register SW and auto-subscribe on app load
function usePWASetup() {
  useEffect(() => {
    (async () => {
      const registration = await registerServiceWorker();
      if (!registration) return;

      const permission = await checkPushPermission();
      if (permission === 'granted') {
        await subscribeToPush(registration);
      }
    })();
  }, []);
}

function AppShell() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const location = useLocation();
  const isChat = location.pathname === '/chat';

  usePWASetup();

  const handleBillAdded = () => {
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="app">
      {!isChat && (
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Timeline refreshKey={refreshKey} />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      )}

      {isChat && (
        <Routes>
          <Route path="/chat" element={<Chat />} />
        </Routes>
      )}

      {!isChat && (
        <>
          <button className="fab" onClick={() => setShowAddModal(true)} aria-label="Add bill">
            <Plus size={24} />
          </button>
          <BottomNav />
        </>
      )}

      {showAddModal && (
        <AddBillModal
          onClose={() => setShowAddModal(false)}
          onAdded={handleBillAdded}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
