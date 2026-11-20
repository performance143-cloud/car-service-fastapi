import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Auth } from './pages/Auth';
import { ClientDashboard } from './pages/ClientDashboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div>
        <nav className="navbar">
          <div className="logo">🚗 АВТОБОСС</div>
          {isAuthenticated && (
            <button onClick={handleLogout} className="btn btn-danger">
              Выйти
            </button>
          )}
        </nav>

        <Routes>
          <Route
            path="/auth"
            element={!isAuthenticated ? <Auth onLoginSuccess={() => setIsAuthenticated(true)} /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/dashboard"
            element={isAuthenticated ? <ClientDashboard /> : <Navigate to="/auth" />}
          />
          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? '/dashboard' : '/auth'} />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
