import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import PantryPage from './pages/PantryPage';
import RecipesPage from './pages/RecipesPage';
import OrdersPage from './pages/OrdersPage';
import AddItemPage from './pages/AddItemPage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <main className="main-content">
          <Routes>
            <Route path="/" element={<PantryPage />} />
            <Route path="/recipes" element={<RecipesPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/add" element={<AddItemPage />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
