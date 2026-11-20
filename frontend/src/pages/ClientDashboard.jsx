import React, { useState, useEffect } from 'react';
import API from '../api';

export function ClientDashboard() {
  const [cars, setCars] = useState([]);
  const [services, setServices] = useState([]);
  const [mechanics, setMechanics] = useState([]);

  // Добавление авто
  const [brandModel, setBrandModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');

  // Запись на сервис
  const [carId, setCarId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [mechanicId, setMechanicId] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [ticket, setTicket] = useState(null);

  const loadInitialData = async () => {
    try {
      const [carsRes, servicesRes] = await Promise.all([
        API.get('/cars'),
        API.get('/services'),
      ]);
      setCars(carsRes.data);
      setServices(servicesRes.data);
    } catch (err) {
      setError('Не удалось загрузить данные. Убедитесь, что вы вошли как клиент.');
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Автоматический поиск свободных мастеров при выборе услуги и времени
  useEffect(() => {
    const fetchAvailableMechanics = async () => {
      if (!serviceId || !dateTime) {
        setMechanics([]);
        setMechanicId('');
        return;
      }
      try {
        const formattedDate = dateTime.length === 16 ? `${dateTime}:00` : dateTime;
        const res = await API.get(`/services/${serviceId}/available-mechanics`, {
          params: { date_time: formattedDate },
        });
                setMechanics(res.data);
        if (res.data.length > 0) {
          setMechanicId(String(res.data.at(0).id));
        } else {
          setMechanicId('');
        }
      } catch (err) {
        console.error('Ошибка поиска мастеров:', err);
      }
    };

    fetchAvailableMechanics();
  }, [serviceId, dateTime]);

  const handleAddCar = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await API.post('/cars', {
        brand_model: brandModel,
        license_plate: licensePlate,
      });
      setMessage('Автомобиль добавлен в гараж!');
      setBrandModel('');
      setLicensePlate('');
      loadInitialData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при добавлении автомобиля');
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setTicket(null);

    try {
      const formattedDate = dateTime.length === 16 ? `${dateTime}:00` : dateTime;
      const response = await API.post('/appointments', {
        car_id: Number(carId),
        service_id: Number(serviceId),
        mechanic_id: Number(mechanicId),
        date_time: formattedDate,
      });
      setTicket(response.data);
      setMessage('Запись успешно оформлена!');
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось создать запись');
    }
  };

  return (
    <div className="container">
      <h1>Личный кабинет клиента</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="grid-2">
        {/* Левая колонка: Гараж */}
        <div>
          <div className="card">
            <h2>🚘 Мои автомобили</h2>
            {cars.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '14px' }}>
                У вас пока нет добавленных машин. Добавьте авто ниже.
              </p>
            ) : (
              cars.map((car) => (
                <div key={car.id} className="car-item">
                  <strong>{car.brand_model}</strong>
                  <span className="plate-badge">{car.license_plate}</span>
                </div>
              ))
            )}
          </div>

          <div className="card">
            <h3>➕ Добавить автомобиль</h3>
            <form onSubmit={handleAddCar}>
              <div className="form-group">
                <label>Марка и модель</label>
                <input
                  type="text"
                  required
                  placeholder="Toyota Camry"
                  value={brandModel}
                  onChange={(e) => setBrandModel(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Госномер</label>
                <input
                  type="text"
                  required
                  placeholder="А123ВС777"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Добавить в гараж
              </button>
            </form>
          </div>
        </div>

        {/* Правая колонка: Запись на ремонт */}
        <div>
          <div className="card">
            <h2>📅 Запись на обслуживание</h2>
            <form onSubmit={handleBookAppointment}>
              <div className="form-group">
                <label>1. Выберите автомобиль</label>
                <select value={carId} onChange={(e) => setCarId(e.target.value)} required>
                  <option value="">-- Выберите машину --</option>
                  {cars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.brand_model} ({c.license_plate})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>2. Выберите услугу</label>
                <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
                  <option value="">-- Выберите услугу --</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} — {s.price} ₽ ({s.duration_minutes} мин.)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>3. Дата и время визита</label>
                <input
                  type="datetime-local"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>4. Свободный мастер на это время</label>
                <select
                  value={mechanicId}
                  onChange={(e) => setMechanicId(e.target.value)}
                  required
                  disabled={mechanics.length === 0}
                >
                  {mechanics.length === 0 ? (
                    <option value="">
                      {serviceId && dateTime ? 'Нет свободных мастеров' : 'Сначала выберите услугу и время'}
                    </option>
                  ) : (
                    mechanics.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={!carId || !serviceId || !dateTime || !mechanicId}
              >
                Получить талон и записаться
              </button>
            </form>

            {ticket && (
              <div className="ticket-box">
                <div>Ваш электронный талон</div>
                <div className="ticket-number">№ {ticket.ticket_number}</div>
                <div>Статус: <strong>{ticket.status}</strong></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
