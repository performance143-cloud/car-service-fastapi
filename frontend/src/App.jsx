import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Auth } from './pages/Auth';
import { ClientDashboard } from './pages/ClientDashboard';
import { MechanicDashboard } from './pages/MechanicDashboard';

function getRoleFromToken(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts.at(1).replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return payload.role || null;
  } catch (e) {
    return null;
  }
}


function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const role = getRoleFromToken(token);

  // Если токен есть, но роль из него не прочиталась (старый или битый токен) — сбрасываем его
  const isValidSession = Boolean(token && role);

  const handleLoginSuccess = () => {
    setToken(localStorage.getItem('token'));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  const getHomeRoute = () => {
    if (!isValidSession) return '/auth';
    if (role === 'mechanic') return '/mechanic';
    return '/dashboard';
  };

  return (
    <Router>
      <div>
        <nav className="navbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div className="logo">🚗 АВТОБОСС</div>
            {isValidSession && (
              <div style={{ display: 'flex', gap: '16px' }}>
                {role === 'client' && (
                  <Link
                    to="/dashboard"
                    style={{ color: '#e2e8f0', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}
                  >
                    Кабинет клиента
                  </Link>
                )}
                {role === 'mechanic' && (
                  <Link
                    to="/mechanic"
                    style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}
                  >
                    Кабинет мастера
                  </Link>
                )}
              </div>
            )}
          </div>

          {isValidSession && (
            <button onClick={handleLogout} className="btn btn-danger">
              Выйти
            </button>
          )}
        </nav>

        <Routes>
          <Route
            path="/auth"
            element={!isValidSession ? <Auth onLoginSuccess={handleLoginSuccess} /> : <Navigate to={getHomeRoute()} replace />}
          />

          <Route
            path="/dashboard"
            element={
              !isValidSession ? (
                <Navigate to="/auth" replace />
              ) : role === 'client' ? (
                <ClientDashboard />
              ) : (
                <Navigate to="/mechanic" replace />
              )
            }
          />

          <Route
            path="/mechanic"
            element={
              !isValidSession ? (
                <Navigate to="/auth" replace />
              ) : role === 'mechanic' ? (
                <MechanicDashboard />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />

          <Route path="*" element={<Navigate to={getHomeRoute()} replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
