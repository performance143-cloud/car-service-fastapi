// frontend/src/App.tsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Auth } from './pages/Auth';
import { ClientDashboard } from './pages/ClientDashboard';
import { QueueMonitor } from './pages/QueueMonitor';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
        {/* Шапка приложения */}
        <nav className="bg-slate-800 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-8">
                <span className="text-xl font-black tracking-wider text-blue-400">🚗 АВТОБОСС</span>
                {isAuthenticated && (
                  <div className="flex space-x-4 text-sm font-medium">
                    <Link to="/dashboard" className="hover:text-blue-300 transition py-2 px-3 rounded">
                      Личный кабинет
                    </Link>
                    <Link to="/queue-monitor" className="hover:text-blue-300 transition py-2 px-3 rounded">
                      Табло очереди / Мастер
                    </Link>
                  </div>
                )}
              </div>
              <div className="flex items-center">
                {!isAuthenticated ? (
                  <span className="text-sm text-slate-400">Авторизация</span>
                ) : (
                  <button onClick={handleLogout} className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 px-4 rounded-lg transition">
                    Выйти
                  </button>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Контент страниц */}
        <main className="py-4">
          <Routes>
            <Route 
              path="/auth" 
              element={!isAuthenticated ? <Auth onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/dashboard" />} 
            />
            <Route 
              path="/dashboard" 
              element={isAuthenticated ? <ClientDashboard /> : <Navigate to="/auth" />} 
            />
            <Route path="/queue-monitor" element={<QueueMonitor />} />
            <Route 
              path="*" 
              element={<Navigate to={isAuthenticated ? "/dashboard" : "/auth"} />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
