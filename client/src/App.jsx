import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import HomePage from './pages/HomePage';
import PantryPage from './pages/PantryPage';
import CheckInPage from './pages/CheckInPage';
import RoutinesPage from './pages/RoutinesPage';
import RecipesPage from './pages/RecipesPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/pantry" element={<PantryPage />} />
            <Route path="/checkin" element={<CheckInPage />} />
            <Route path="/routines" element={<RoutinesPage />} />
            <Route path="/recipes" element={<RecipesPage />} />
          </Routes>
        </main>
        <NavBar />
      </div>
    </BrowserRouter>
  );
}
