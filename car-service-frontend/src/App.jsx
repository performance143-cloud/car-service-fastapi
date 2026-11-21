import { useState, useEffect } from 'react';
import apiClient from './api/client';
import './App.css';

const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

function App() {
  const [brands, setBrands] = useState([]);
  const [services, setServices] = useState([]);
  const [cars, setCars] = useState([]);
  const [models, setModels] = useState([]);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [error, setError] = useState(null);
  const [loginError, setLoginError] = useState(null);
  
  // Состояния для авторизации/регистрации
  const [isLogin, setIsLogin] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regError, setRegError] = useState(null);

  const [newCar, setNewCar] = useState({ brand_id: '', model_id: '', license_plate: '' });
  const [newAppointment, setNewAppointment] = useState({ car_id: '', service_id: '', mechanic_id: '', date_time: '' });
  const [availableMechanics, setAvailableMechanics] = useState([]);

  const [clientAppointments, setClientAppointments] = useState([]);
  const [mechanicAppointments, setMechanicAppointments] = useState([]);
  const [mechanicStats, setMechanicStats] = useState(null);

  const [newBrandName, setNewBrandName] = useState('');
  const [newModelData, setNewModelData] = useState({ brand_id: '', name: '' });
  const [newServiceData, setNewServiceData] = useState({ title: '', price: '', duration_minutes: '' });

  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  // Состояния для админ-панели (мастера и финансы)
  const [mechanicsList, setMechanicsList] = useState([]);
  const [newMechanicData, setNewMechanicData] = useState({ email: '', password: '', name: '' });
  const [financeStats, setFinanceStats] = useState(null);

  const userRole = token ? parseJwt(token)?.role : null;

  // --- ФУНКЦИИ-ХЕЛПЕРЫ ---
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const formatLicensePlate = (value) => {
    const clean = value.replace(/[^А-ЯA-Z0-9]/gi, '').toUpperCase();
    const limited = clean.slice(0, 9);
    let result = '';
    for (let i = 0; i < limited.length; i++) {
      if (i === 0 || i === 4 || i === 5) {
        if (/[А-ЯA-Z]/.test(limited[i])) result += limited[i];
      } else {
        if (/[0-9]/.test(limited[i])) result += limited[i];
      }
    }
    return result;
  };

  const formatPhone = (value) => {
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 0) return '';
    if (cleaned[0] === '7' || cleaned[0] === '8') cleaned = cleaned.substring(1);
    let result = '+7 ';
    if (cleaned.length > 0) result += '(' + cleaned.substring(0, 3);
    if (cleaned.length > 3) result += ') ' + cleaned.substring(3, 6);
    if (cleaned.length > 6) result += '-' + cleaned.substring(6, 8);
    if (cleaned.length > 8) result += '-' + cleaned.substring(8, 10);
    return result;
  };

  const getCarInfo = (carId) => {
    const car = cars.find(c => c.id === carId);
    return car ? `${car.brand?.name} ${car.model_name} (${car.license_plate})` : `Машина #${carId}`;
  };

  const getServiceTitle = (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.title : `Услуга #${serviceId}`;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'ожидает': { className: 'status-pending', label: 'Ожидает' },
      'в работе': { className: 'status-in_progress', label: 'В работе' },
      'готова': { className: 'status-done', label: 'Готова' },
      'отменена': { className: 'status-cancelled', label: 'Отменена' },
    };
    const config = statusMap[status] || { className: '', label: status };
    return <span className={`status-badge ${config.className}`}>{config.label}</span>;
  };

  // --- ЗАГРУЗКА ДАННЫХ ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const brandsResponse = await apiClient.get('/brands');
        const servicesResponse = await apiClient.get('/services');
        const sortedBrands = brandsResponse.data.sort((a, b) => a.name.localeCompare(b.name));
        setBrands(sortedBrands);
        setServices(servicesResponse.data);
      } catch (err) {
        console.error("Ошибка при загрузке данных:", err);
        setError("Не удалось загрузить данные. Проверьте, запущен ли бэкенд.");
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (newCar.brand_id) {
      const fetchModels = async () => {
        try {
          const response = await apiClient.get(`/brands/${newCar.brand_id}/models`);
          setModels(response.data);
        } catch (err) { console.error("Ошибка загрузки моделей:", err); }
      };
      fetchModels();
    } else {
      setModels([]);
    }
    setNewCar(prev => ({...prev, model_id: ''}));
  }, [newCar.brand_id]);

  useEffect(() => {
    setAvailableMechanics([]);
    setNewAppointment(prev => ({ ...prev, mechanic_id: '' }));
  }, [newAppointment.date_time, newAppointment.service_id]);

  const fetchCars = async () => {
    if (!token) return;
    try {
      const response = await apiClient.get('/cars');
      setCars(response.data);
    } catch (err) { console.error("Ошибка при загрузке машин:", err); }
  };

  const fetchClientAppointments = async () => {
    if (!token || userRole !== 'client') return;
    try {
      const response = await apiClient.get('/clients/me/appointments');
      setClientAppointments(response.data);
    } catch (err) { console.error("Ошибка загрузки записей клиента:", err); }
  };

  const fetchMechanicAppointments = async () => {
    if (!token || userRole !== 'mechanic') return;
    try {
      const response = await apiClient.get('/mechanics/me/appointments');
      setMechanicAppointments(response.data);
    } catch (err) { console.error("Ошибка загрузки записей мастера:", err); }
  };

  const fetchMechanicStats = async () => {
    if (!token || userRole !== 'mechanic') return;
    try {
      const response = await apiClient.get('/mechanics/me/stats');
      setMechanicStats(response.data);
    } catch (err) { console.error("Ошибка загрузки статистики мастера:", err); }
  };

  const fetchMechanics = async () => {
    if (!token || userRole !== 'admin') return;
    try {
      const response = await apiClient.get('/admin/mechanics');
      setMechanicsList(response.data);
    } catch (err) { console.error("Ошибка загрузки мастеров:", err); }
  };

  const fetchFinanceStats = async () => {
    if (!token || userRole !== 'admin') return;
    try {
      const response = await apiClient.get('/admin/finance');
      setFinanceStats(response.data);
    } catch (err) { console.error("Ошибка загрузки финансовой статистики:", err); }
  };

  useEffect(() => {
    fetchCars();
    fetchClientAppointments();
    fetchMechanicAppointments();
    fetchMechanicStats();
    fetchMechanics();
    fetchFinanceStats();
  }, [token, userRole]);

  // --- ОБРАБОТЧИКИ ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const response = await apiClient.post('/auth/login', { email: authEmail, password: authPassword });
      const newToken = response.data.access_token;
      setToken(newToken);
      localStorage.setItem('token', newToken);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setAuthEmail('');
      setAuthPassword('');
    } catch (err) {
      setLoginError("Неверный email или пароль");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError(null);
    if (!authEmail.includes('@') || !authEmail.includes('.')) return setRegError("Введите корректный email");
    if (authPassword.length < 6) return setRegError("Пароль должен быть не менее 6 символов");
    if (regName.length < 2) return setRegError("Имя должно быть не менее 2 символов");
    if (regPhone.replace(/\D/g, '').length < 11) return setRegError("Введите корректный номер телефона");

    try {
      const cleanPhone = regPhone.replace(/[^\d+]/g, '');
      await apiClient.post('/auth/register', {
        email: authEmail, password: authPassword, name: regName, phone: cleanPhone
      });
      showNotification("Регистрация успешна! Теперь войдите.");
      setIsLogin(true);
      setAuthPassword(''); setRegName(''); setRegPhone('');
    } catch (err) {
      let errorMessage = "Ошибка регистрации";
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) errorMessage = err.response.data.detail.map(e => e.msg).join(', ');
        else errorMessage = err.response.data.detail;
      }
      setRegError(errorMessage);
    }
  };

  const handleLogout = () => {
    setToken(''); localStorage.removeItem('token');
    delete apiClient.defaults.headers.common['Authorization'];
    setCars([]); setClientAppointments([]); setMechanicAppointments([]); setMechanicStats(null);
    setMechanicsList([]); setFinanceStats(null);
  };

  const handleSearchMechanics = async () => {
    if (!newAppointment.service_id || !newAppointment.date_time) return showNotification("Выберите услугу и время", 'error');
    setLoading(true);
    try {
      const response = await apiClient.get(`/services/${newAppointment.service_id}/available-mechanics`, {
        params: { date_time: newAppointment.date_time }
      });
      setAvailableMechanics(response.data);
      if (response.data.length === 0) showNotification("Нет свободных мастеров на это время", 'error');
    } catch (err) {
      showNotification("Ошибка: " + (err.response?.data?.detail || "Не удалось найти мастеров"), 'error');
    } finally { setLoading(false); }
  };

  const setQuickTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1); now.setMinutes(0);
    setNewAppointment(prev => ({ ...prev, date_time: now.toISOString().slice(0, 16) }));
  };

  const handleAddCar = async (e) => {
    e.preventDefault();
    try {
      const selectedModel = models.find(m => m.id === parseInt(newCar.model_id));
      await apiClient.post('/cars', {
        brand_id: parseInt(newCar.brand_id),
        model_name: selectedModel ? selectedModel.name : 'Неизвестно',
        license_plate: newCar.license_plate
      });
      setNewCar({ brand_id: '', model_id: '', license_plate: '' });
      fetchCars();
      showNotification("Машина успешно добавлена!");
    } catch (err) {
      showNotification("Ошибка: " + (err.response?.data?.detail || "Не удалось добавить машину"), 'error');
    }
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/appointments', {
        car_id: parseInt(newAppointment.car_id),
        service_id: parseInt(newAppointment.service_id),
        mechanic_id: parseInt(newAppointment.mechanic_id),
        date_time: newAppointment.date_time
      });
      showNotification("Запись успешно создана!");
      setNewAppointment({ car_id: '', service_id: '', mechanic_id: '', date_time: '' });
      setAvailableMechanics([]);
      fetchClientAppointments();
    } catch (err) {
      showNotification("Ошибка: " + (err.response?.data?.detail || "Не удалось создать запись"), 'error');
    }
  };

  const handleCancelAppointment = async (id) => {
    if (!window.confirm("Вы уверены, что хотите отменить запись?")) return;
    try {
      await apiClient.patch(`/appointments/${id}/cancel`);
      fetchClientAppointments();
      showNotification("Запись отменена");
    } catch (err) {
      showNotification("Ошибка: " + (err.response?.data?.detail || "Не удалось отменить запись"), 'error');
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await apiClient.patch(`/appointments/${id}/status`, null, { params: { new_status: newStatus } });
      fetchMechanicAppointments();
      fetchMechanicStats();
      showNotification("Статус обновлён");
    } catch (err) {
      showNotification("Ошибка: " + (err.response?.data?.detail || "Не удалось обновить статус"), 'error');
    }
  };

  const handleCreateBrand = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/admin/brands', null, { params: { name: newBrandName } });
      showNotification("Марка добавлена!");
      setNewBrandName('');
      const response = await apiClient.get('/brands');
      setBrands(response.data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      showNotification("Ошибка: " + (err.response?.data?.detail || "Не удалось добавить марку"), 'error');
    }
  };

  const handleCreateModel = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/admin/models', {
        brand_id: parseInt(newModelData.brand_id),
        name: newModelData.name
      });
      showNotification("Модель добавлена!");
      setNewModelData({ brand_id: '', name: '' });
      if (newCar.brand_id === newModelData.brand_id) {
        const response = await apiClient.get(`/brands/${newModelData.brand_id}/models`);
        setModels(response.data);
      }
    } catch (err) {
      showNotification("Ошибка: " + (err.response?.data?.detail || "Не удалось добавить модель"), 'error');
    }
  };

  const handleCreateService = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/admin/services', {
        title: newServiceData.title,
        price: parseFloat(newServiceData.price),
        duration_minutes: parseInt(newServiceData.duration_minutes)
      });
      showNotification("Услуга добавлена!");
      setNewServiceData({ title: '', price: '', duration_minutes: '' });
      const response = await apiClient.get('/services');
      setServices(response.data);
    } catch (err) {
      showNotification("Ошибка: " + (err.response?.data?.detail || "Не удалось добавить услугу"), 'error');
    }
  };

  const handleCreateMechanic = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/admin/mechanics', newMechanicData);
      showNotification("Мастер добавлен!");
      setNewMechanicData({ email: '', password: '', name: '' });
      fetchMechanics();
    } catch (err) {
      showNotification("Ошибка: " + (err.response?.data?.detail || "Не удалось добавить мастера"), 'error');
    }
  };

  const handleDeleteMechanic = async (id) => {
    if (!window.confirm("Вы уверены, что хотите уволить мастера?")) return;
    try {
      await apiClient.delete(`/admin/mechanics/${id}`);
      showNotification("Мастер уволен");
      fetchMechanics();
    } catch (err) {
      showNotification("Ошибка: " + (err.response?.data?.detail || "Не удалось уволить мастера"), 'error');
    }
  };

  const filteredClientAppointments = clientAppointments.filter(app => {
    if (filterStatus === 'all') return true;
    return app.status === filterStatus;
  });

  // --- КАТЕГОРИЗАЦИЯ ЗАДАЧ МАСТЕРА ---
  const categorizeAppointments = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const past = [];
    const today = [];
    const future = [];

    mechanicAppointments.forEach(app => {
      const appDate = new Date(app.date_time);
      if (appDate < todayStart) {
        past.push(app);
      } else if (appDate >= todayStart && appDate < todayEnd) {
        today.push(app);
      } else {
        future.push(app);
      }
    });

    past.sort((a, b) => new Date(b.date_time) - new Date(a.date_time));
    today.sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
    future.sort((a, b) => new Date(a.date_time) - new Date(b.date_time));

    return { past, today, future };
  };

  const { past, today, future } = categorizeAppointments();

  // --- ЭКРАН АВТОРИЗАЦИИ / РЕГИСТРАЦИИ ---
  if (!token) {
    return (
      <div className="App">
        <div className="auth-card">
          <h1 className="auth-title">{isLogin ? 'Вход в АвтоБосс' : 'Регистрация'}</h1>
          
          {isLogin ? (
            <form onSubmit={handleLogin} className="auth-form">
              {loginError && <div className="error-msg">{loginError}</div>}
              <input type="email" placeholder="Email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required />
              <input type="password" placeholder="Пароль" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required />
              <button type="submit">Войти</button>
              <p className="auth-link">
                Нет аккаунта? <span onClick={() => { setIsLogin(false); setLoginError(null); }}>Зарегистрироваться</span>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="auth-form">
              {regError && <div className="error-msg">{regError}</div>}
              <input type="email" placeholder="Email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required />
              <input type="text" placeholder="Имя" value={regName} onChange={(e) => setRegName(e.target.value)} required />
              <input type="password" placeholder="Пароль (мин. 6 символов)" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required />
              <input type="tel" placeholder="+7 (999) 123-45-67" value={regPhone} onChange={(e) => setRegPhone(formatPhone(e.target.value))} required />
              <button type="submit">Зарегистрироваться</button>
              <p className="auth-link">
                Уже есть аккаунт? <span onClick={() => { setIsLogin(true); setRegError(null); }}>Войти</span>
              </p>
            </form>
          )}
        </div>
        {notification && <div className={`notification ${notification.type}`}>{notification.message}</div>}
      </div>
    );
  }

  // --- ОСНОВНОЙ ЭКРАН ---
  return (
    <div className="App dashboard-view">
      <header className="App-header">
        <div className="main-title">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
          </svg>
          <span>АвтоБосс</span>
        </div>
        
        <p>Вы вошли как: <strong>{userRole === 'admin' ? 'Администратор' : userRole === 'mechanic' ? 'Мастер' : 'Клиент'}</strong></p>
        {mechanicStats && <p>Выполнено машин: <strong>{mechanicStats.completed_cars}</strong></p>}
        
        <button onClick={handleLogout} className="btn-logout">Выйти</button>
        
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {loading && <p>Загрузка...</p>}

        <div className="dashboard">
          
          {/* Блоки для клиента */}
          {userRole === 'client' && (
            <>
              <div className="card highlight">
                <h2>Мои машины</h2>
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                  {cars.map(car => (
                    <li key={car.id} style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                      <strong>{car.model_name}</strong> ({car.license_plate})<br/>
                      Марка: {car.brand?.name || 'Неизвестно'}
                    </li>
                  ))}
                  {cars.length === 0 && <p>Машин пока нет.</p>}
                </ul>
                <h3>Добавить машину</h3>
                <form onSubmit={handleAddCar} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <select value={newCar.brand_id} onChange={(e) => setNewCar({...newCar, brand_id: e.target.value})} required>
                    <option value="">Выберите марку</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <select value={newCar.model_id} onChange={(e) => setNewCar({...newCar, model_id: e.target.value})} required disabled={!newCar.brand_id}>
                    <option value="">Выберите модель</option>
                    {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <input type="text" placeholder="А111АА123" value={newCar.license_plate} onChange={(e) => setNewCar({...newCar, license_plate: formatLicensePlate(e.target.value)})} required />
                  <button type="submit">Добавить</button>
                </form>
              </div>

              <div className="card" style={{ width: '350px' }}>
                <h2>Создать запись</h2>
                <form onSubmit={handleCreateAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <select value={newAppointment.car_id} onChange={(e) => setNewAppointment({...newAppointment, car_id: e.target.value})} required>
                    <option value="">Выберите машину</option>
                    {cars.map(c => <option key={c.id} value={c.id}>{c.brand?.name} {c.model_name} ({c.license_plate})</option>)}
                  </select>
                  <select value={newAppointment.service_id} onChange={(e) => setNewAppointment({...newAppointment, service_id: e.target.value})} required>
                    <option value="">Выберите услугу</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.title} ({s.price} руб.)</option>)}
                  </select>
                  <label style={{ fontSize: '0.9em', textAlign: 'left' }}>Дата и время:</label>
                  <input type="datetime-local" value={newAppointment.date_time} onChange={(e) => setNewAppointment({...newAppointment, date_time: e.target.value})} required />
                  <button type="button" onClick={setQuickTime} style={{ backgroundColor: '#e0e0e0', color: '#333', border: '1px solid #ccc', marginBottom: '5px' }}>Сейчас + 1 час</button>
                  <button type="button" onClick={handleSearchMechanics} style={{ backgroundColor: '#e0e0e0', color: '#333', border: '1px solid #ccc' }}>Найти свободных мастеров</button>
                  {availableMechanics.length > 0 && (
                    <>
                      <label style={{ fontSize: '0.9em', textAlign: 'left' }}>Выберите мастера:</label>
                      <select value={newAppointment.mechanic_id} onChange={(e) => setNewAppointment({...newAppointment, mechanic_id: e.target.value})} required>
                        <option value="">Выберите мастера</option>
                        {availableMechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </>
                  )}
                  <button type="submit" style={{ marginTop: '10px' }} disabled={!newAppointment.mechanic_id}>Записаться</button>
                </form>
              </div>

              <div className="card" style={{ width: '350px' }}>
                <h2>Мои записи</h2>
                <div style={{ marginBottom: '10px' }}>
                  <label>Фильтр по статусу: </label>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ width: 'auto', display: 'inline-block', marginLeft: '10px' }}>
                    <option value="all">Все</option>
                    <option value="ожидает">Ожидает</option>
                    <option value="в работе">В работе</option>
                    <option value="готова">Готова</option>
                    <option value="отменена">Отменена</option>
                  </select>
                </div>
                {filteredClientAppointments.length === 0 && <p>Записей нет.</p>}
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                  {filteredClientAppointments.map(app => (
                    <li key={app.id} style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                      <strong>Запись #{app.id}</strong> (Талон: {app.ticket_number})<br/>
                      Машина: {getCarInfo(app.car_id)}<br/>
                      Услуга: {getServiceTitle(app.service_id)}<br/>
                      Статус: {getStatusBadge(app.status)}<br/>
                      Время: {new Date(app.date_time).toLocaleString()}<br/>
                      {app.status !== 'отменена' && app.status !== 'готова' && (
                        <button onClick={() => handleCancelAppointment(app.id)} style={{ marginTop: '5px', backgroundColor: '#ffcccc', color: '#a00' }}>Отменить</button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Блок для мастера */}
          {userRole === 'mechanic' && (
            <>
              <div className="card" style={{ width: '400px' }}>
                <h2>Задачи на сегодня</h2>
                {today.length === 0 && <p>На сегодня задач нет.</p>}
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                  {today.map(app => (
                    <li key={app.id} style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                      <strong>Запись #{app.id}</strong> (Талон: {app.ticket_number})<br/>
                      Время: <strong style={{ color: '#e53935' }}>{new Date(app.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong><br/>
                      Машина: {getCarInfo(app.car_id)}<br/>
                      Услуга: {getServiceTitle(app.service_id)}<br/>
                      Статус: {getStatusBadge(app.status)}<br/>
                      {app.status === 'ожидает' && (
                        <button onClick={() => handleUpdateStatus(app.id, 'в работе')} style={{ marginTop: '5px', backgroundColor: '#ffffcc', color: '#886600' }}>В работу</button>
                      )}
                      {app.status === 'в работе' && (
                        <button onClick={() => handleUpdateStatus(app.id, 'готова')} style={{ marginTop: '5px', backgroundColor: '#ccffcc', color: '#006600' }}>Завершить</button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card" style={{ width: '400px' }}>
                <h2>Будущие задачи</h2>
                {future.length === 0 && <p>Будущих задач нет.</p>}
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                  {future.map(app => (
                    <li key={app.id} style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                      <strong>Запись #{app.id}</strong> (Талон: {app.ticket_number})<br/>
                      Время: {new Date(app.date_time).toLocaleString()}<br/>
                      Машина: {getCarInfo(app.car_id)}<br/>
                      Услуга: {getServiceTitle(app.service_id)}<br/>
                      Статус: {getStatusBadge(app.status)}<br/>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card" style={{ width: '400px' }}>
                <h2>Прошлые задачи</h2>
                {past.length === 0 && <p>Прошлых задач нет.</p>}
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                  {past.map(app => (
                    <li key={app.id} style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px', opacity: 0.7 }}>
                      <strong>Запись #{app.id}</strong> (Талон: {app.ticket_number})<br/>
                      Время: {new Date(app.date_time).toLocaleString()}<br/>
                      Машина: {getCarInfo(app.car_id)}<br/>
                      Услуга: {getServiceTitle(app.service_id)}<br/>
                      Статус: {getStatusBadge(app.status)}<br/>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Блок услуг (только для клиента и мастера) */}
          {userRole !== 'admin' && (
            <div className="card">
              <h2>Услуги</h2>
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                {services.map((service) => (
                  <li key={service.id} style={{ marginBottom: '10px' }}>
                    {service.title} — <strong>{service.price} руб.</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Блок админ-панели */}
          {userRole === 'admin' && (
            <div className="card" style={{ border: '2px solid #4CAF50', backgroundColor: '#f9fff9', width: '400px' }}>
              <h2 style={{ color: '#4CAF50' }}>Админ-панель</h2>
              
              <h3>Добавить марку</h3>
              <form onSubmit={handleCreateBrand} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                <input type="text" placeholder="Название марки (BMW)" value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} required />
                <button type="submit" style={{ backgroundColor: '#e0ffe0', color: '#006600' }}>Добавить марку</button>
              </form>

              <h3>Добавить модель</h3>
              <form onSubmit={handleCreateModel} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                <select value={newModelData.brand_id} onChange={(e) => setNewModelData({...newModelData, brand_id: e.target.value})} required>
                  <option value="">Выберите марку</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <input type="text" placeholder="Название модели (X5)" value={newModelData.name} onChange={(e) => setNewModelData({...newModelData, name: e.target.value})} required />
                <button type="submit" style={{ backgroundColor: '#e0ffe0', color: '#006600' }}>Добавить модель</button>
              </form>

              <h3>Добавить услугу</h3>
              <form onSubmit={handleCreateService} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input type="text" placeholder="Название услуги" value={newServiceData.title} onChange={(e) => setNewServiceData({...newServiceData, title: e.target.value})} required />
                <input type="number" placeholder="Цена (руб.)" value={newServiceData.price} onChange={(e) => setNewServiceData({...newServiceData, price: e.target.value})} required />
                <input type="number" placeholder="Длительность (мин.)" value={newServiceData.duration_minutes} onChange={(e) => setNewServiceData({...newServiceData, duration_minutes: e.target.value})} required />
                <button type="submit" style={{ backgroundColor: '#e0ffe0', color: '#006600' }}>Добавить услугу</button>
              </form>
            </div>
          )}

          {/* Управление мастерами (админ) */}
          {userRole === 'admin' && (
            <div className="card" style={{ width: '400px' }}>
              <h2>Управление мастерами</h2>
              <h3>Добавить мастера</h3>
              <form onSubmit={handleCreateMechanic} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                <input type="email" placeholder="Email" value={newMechanicData.email} onChange={(e) => setNewMechanicData({...newMechanicData, email: e.target.value})} required />
                <input type="password" placeholder="Пароль" value={newMechanicData.password} onChange={(e) => setNewMechanicData({...newMechanicData, password: e.target.value})} required />
                <input type="text" placeholder="Имя мастера" value={newMechanicData.name} onChange={(e) => setNewMechanicData({...newMechanicData, name: e.target.value})} required />
                <button type="submit">Добавить мастера</button>
              </form>
              
              <h3>Список мастеров</h3>
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                {mechanicsList.map(mech => (
                  <li key={mech.id} style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{mech.name} (ID: {mech.id})</span>
                    <button onClick={() => handleDeleteMechanic(mech.id)} style={{ backgroundColor: '#ffcccc', color: '#a00', padding: '2px 8px', fontSize: '12px' }}>Уволить</button>
                  </li>
                ))}
                {mechanicsList.length === 0 && <p>Мастеров пока нет.</p>}
              </ul>
            </div>
          )}

          {/* Финансовая статистика (админ) */}
          {userRole === 'admin' && financeStats && (
            <div className="card" style={{ width: '600px' }}>
              <h2>Финансовая статистика</h2>
              <p><strong>Общий доход фирмы (35%):</strong> {financeStats.total_firm_income.toFixed(2)} руб.</p>
              <p><strong>Общая сумма к выплате мастерам (65%):</strong> {financeStats.total_mechanics_earnings.toFixed(2)} руб.</p>
              
              <h3>По мастерам</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee' }}>
                    <th style={{ textAlign: 'left' }}>Мастер</th>
                    <th style={{ textAlign: 'right' }}>Выполнено</th>
                    <th style={{ textAlign: 'right' }}>Стоимость услуг</th>
                    <th style={{ textAlign: 'right' }}>Заработок (65%)</th>
                    <th style={{ textAlign: 'right' }}>Доход фирмы (35%)</th>
                  </tr>
                </thead>
                <tbody>
                  {financeStats.mechanics.map(m => (
                    <tr key={m.mechanic_id} style={{ borderBottom: '1px solid #eee' }}>
                      <td>{m.mechanic_name}</td>
                      <td style={{ textAlign: 'right' }}>{m.completed_count}</td>
                      <td style={{ textAlign: 'right' }}>{m.total_service_cost.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>{m.earnings.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>{m.firm_income.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </header>

      {notification && <div className={`notification ${notification.type}`}>{notification.message}</div>}
    </div>
  );
}

export default App;