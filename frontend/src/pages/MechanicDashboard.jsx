import React, { useState, useEffect } from 'react';
import API from '../api';

export function MechanicDashboard() {
  const [stats, setStats] = useState({ mechanic_name: '', completed_cars: 0 });
  const [appointments, setAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'future' | 'past' | 'all'
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadMechanicData = async () => {
    try {
      const [statsRes, appsRes] = await Promise.all([
        API.get('/mechanics/me/stats'),
        API.get('/mechanics/me/appointments'),
      ]);

      setStats(statsRes.data || { mechanic_name: '', completed_cars: 0 });

      const rawApps = appsRes.data;
      const appsList = Array.isArray(rawApps)
        ? rawApps
        : Array.isArray(rawApps?.appointments)
        ? rawApps.appointments
        : Array.isArray(rawApps?.items)
        ? rawApps.items
        : [];

      setAppointments(appsList);
      setError('');
    } catch (err) {
      setAppointments([]);
      setError(
        err.response?.data?.detail ||
          'Доступ запрещен. Войдите под аккаунтом мастера (например, master1@autoboss.ru).'
      );
    }
  };

  useEffect(() => {
    loadMechanicData();
  }, []);

  const handleStatusChange = async (appointmentId, newStatus) => {
    setError('');
    setMessage('');
    try {
      await API.patch(`/appointments/${appointmentId}/status`, null, {
        params: { new_status: newStatus },
      });
      setMessage(`Статус записи обновлён: «${newStatus}»`);
      loadMechanicData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось изменить статус');
    }
  };

  // Определяем текущую локальную дату в формате YYYY-MM-DD
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const safeAppointments = Array.isArray(appointments) ? appointments : [];

  const filteredAppointments = safeAppointments.filter((app) => {
    if (!app || !app.date_time) return false;
    const appDate = new Date(app.date_time);
    const appDateStr = String(app.date_time).slice(0, 10);

    if (activeTab === 'current') {
      return appDateStr === todayStr || app.status === 'в работе';
    }
    if (activeTab === 'future') {
      return appDateStr > todayStr;
    }
    if (activeTab === 'past') {
      return appDateStr < todayStr;
    }
    return true;
  });

  return (
    <div className="container">
      {/* Верхняя панель со статистикой */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ marginBottom: '4px' }}>
            🔧 Кабинет мастера: {stats.mechanic_name || 'Мастер'}
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Управление рабочим графиком и статусами ремонта
          </p>
        </div>
        <div
          style={{
            background: '#eff6ff',
            border: '1.5px solid #3b82f6',
            padding: '12px 24px',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#1d4ed8',
              textTransform: 'uppercase',
            }}
          >
            Сделано машин
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a' }}>
            {stats.completed_cars ?? 0}
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      {/* Кнопки переключения графиков */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          className="btn"
          style={{
            background: activeTab === 'current' ? '#2563eb' : '#e2e8f0',
            color: activeTab === 'current' ? 'white' : '#1e293b',
          }}
          onClick={() => setActiveTab('current')}
        >
          ⏱️ На текущее время
        </button>
        <button
          className="btn"
          style={{
            background: activeTab === 'future' ? '#2563eb' : '#e2e8f0',
            color: activeTab === 'future' ? 'white' : '#1e293b',
          }}
          onClick={() => setActiveTab('future')}
        >
          📅 Будущие записи
        </button>
        <button
          className="btn"
          style={{
            background: activeTab === 'past' ? '#2563eb' : '#e2e8f0',
            color: activeTab === 'past' ? 'white' : '#1e293b',
          }}
          onClick={() => setActiveTab('past')}
        >
          🗂️ Предыдущие записи
        </button>
        <button
          className="btn"
          style={{
            background: activeTab === 'all' ? '#0f172a' : '#e2e8f0',
            color: activeTab === 'all' ? 'white' : '#1e293b',
          }}
          onClick={() => setActiveTab('all')}
        >
          📋 Смотреть свои записи ({safeAppointments.length})
        </button>
      </div>

      {/* Список записей */}
      <div className="card">
        <h2>
          {activeTab === 'current' && 'График на текущее время (сегодня)'}
          {activeTab === 'future' && 'Будущие записи'}
          {activeTab === 'past' && 'Предыдущие записи'}
          {activeTab === 'all' && 'Все мои записи'}
        </h2>

        {filteredAppointments.length === 0 ? (
          <p style={{ color: '#64748b', padding: '16px 0' }}>В этом разделе записей пока нет.</p>
        ) : (
          filteredAppointments.map((app) => (
            <div
              key={app.id}
              className="car-item"
              style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  <strong style={{ fontSize: '17px' }}>
                    Талон №{app.ticket_number} — {app.service_title}
                  </strong>
                  <div style={{ fontSize: '14px', color: '#475569', marginTop: '4px' }}>
                    Авто: <strong>{app.car_model}</strong> (
                    <span className="plate-badge">{app.license_plate}</span>)
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                    Время: <strong>{new Date(app.date_time).toLocaleString('ru-RU')}</strong> (
                    {app.duration_minutes} мин.)
                  </div>
                </div>

                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: '#e2e8f0',
                    fontWeight: '700',
                    fontSize: '13px',
                  }}
                >
                  Статус: {app.status}
                </div>
              </div>

              {/* Кнопки управления статусом */}
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  className="btn"
                  style={{
                    background: '#f59e0b',
                    color: 'white',
                    padding: '8px 14px',
                    fontSize: '13px',
                  }}
                  onClick={() => handleStatusChange(app.id, 'в работе')}
                >
                  ▶️ Начать работу
                </button>
                <button
                  className="btn"
                  style={{
                    background: '#16a34a',
                    color: 'white',
                    padding: '8px 14px',
                    fontSize: '13px',
                  }}
                  onClick={() => handleStatusChange(app.id, 'работа завершена')}
                >
                  ✅ Работа завершена
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleStatusChange(app.id, 'работа не завершена')}
                >
                  ⚠️ Работа не завершена
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
