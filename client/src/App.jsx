import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import BottomNav from './components/BottomNav';
import AddBillModal from './components/AddBillModal';
import Timeline from './pages/Timeline';
import History from './pages/History';
import Settings from './pages/Settings';
import Chat from './pages/Chat';
import ConnectBank from './pages/ConnectBank';
import Transactions from './pages/Transactions';
import { registerServiceWorker, subscribeToPush, checkPushPermission } from './services/pushManager';

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
  const isActiveChat = location.pathname === '/chat' && location.search.includes('active=1');

  usePWASetup();

  const handleBillAdded = () => {
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="app">
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Timeline refreshKey={refreshKey} />} />
          <Route path="/history" element={<History />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/connect-bank" element={<ConnectBank />} />
          <Route path="/transactions" element={<Transactions />} />
        </Routes>
      </main>

      {!isActiveChat && (
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
