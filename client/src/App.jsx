import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Plus } from 'lucide-react';
import BottomNav from './components/BottomNav';
import AddBillModal from './components/AddBillModal';
import Timeline from './pages/Timeline';
import History from './pages/History';
import Settings from './pages/Settings';

export default function App() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleBillAdded = () => {
    setRefreshKey(k => k + 1);
  };

  return (
    <BrowserRouter>
      <div className="app">
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Timeline refreshKey={refreshKey} />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>

        <button className="fab" onClick={() => setShowAddModal(true)} aria-label="Add bill">
          <Plus size={24} />
        </button>

        <BottomNav />

        {showAddModal && (
          <AddBillModal
            onClose={() => setShowAddModal(false)}
            onAdded={handleBillAdded}
          />
        )}
      </div>
    </BrowserRouter>
  );
}
