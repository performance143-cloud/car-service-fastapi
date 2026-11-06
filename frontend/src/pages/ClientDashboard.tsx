// frontend/src/pages/ClientDashboard.tsx
import React, { useState, useEffect } from 'react';
import API from '../api';

interface Car {
  id: number;
  brand_model: string;
  license_plate: string;
}

interface Service {
  id: number;
  title: string;
  price: number;
  duration_minutes: number;
}

export const ClientDashboard: React.FC = () => {
  // Для интеграции с query-параметрами бэкенда используем тестовый user_id. 
  // В реальной системе он извлекается из JWT, но наш бэкенд ждет его числом в URL.
  const [userId, setUserId] = useState<number>(1); 
  
  const [cars, setCars] = useState<Car[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  
  // Состояния для форм
  const [newBrand, setNewBrand] = useState('');
  const [newPlate, setNewPlate] = useState('');
  
  const [selectedCarId, setSelectedCarId] = useState<number | string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<number | string>('');
  const [mechanicId] = useState<number>(1); // Дефолтный мастер
  const [appointmentDate, setAppointmentDate] = useState('');
  const [boxNumber, setBoxNumber] = useState<number>(1);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState<any>(null);

  // Загрузка машин и прайс-листа услуг
  const loadData = async () => {
    try {
      const carsRes = await API.get(`/cars?user_id=${userId}`);
      setCars(carsRes.data);
      
      const servicesRes = await API.get('/services');
      setServices(servicesRes.data);
    } catch (err: any) {
      console.error("Ошибка загрузки данных", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  // Добавление автомобиля (POST /cars)
  const handleAddCar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await API.post(`/cars?user_id=${userId}`, {
        brand_model: newBrand,
        license_plate: newPlate
      });
      setMessage('Автомобиль успешно добавлен!');
      setNewBrand('');
      setNewPlate('');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Не удалось добавить автомобиль');
    }
  };

  // Онлайн-запись на ремонт (POST /appointments)
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setTicket(null);

    if (!selectedCarId || !selectedServiceId || !appointmentDate) {
      setError('Пожалуйста, заполните все поля записи');
      return;
    }

    try {
      const response = await API.post('/appointments', {
        car_id: Number(selectedCarId),
        service_id: Number(selectedServiceId),
        mechanic_id: Number(mechanicId),
        date_time: new Date(appointmentDate).toISOString().split('.')[0], // Формат YYYY-MM-DDTHH:MM:SS
        box_number: Number(boxNumber)
      });
      
      setTicket(response.data);
      setMessage('Вы успешно записаны на ремонт!');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Этот бокс уже занят на выбранное время!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Шапка */}
        <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-center border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Личный кабинет клиента</h1>
            <p className="text-sm text-gray-500">Управление гаражом и онлайн-запись на обслуживание</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-y-2 md:space-y-0 md:space-x-2">
            <span className="text-sm text-gray-600 font-medium">Ваш Тестовый ID пользователя в БД:</span>
            <input type="number" value={userId} onChange={e => setUserId(Number(e.target.value))} 
              className="w-16 p-1 border rounded bg-slate-100 text-center font-bold text-blue-600"/>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 font-medium">{error}</div>}
        {message && <div className="bg-green-50 text-green-600 p-4 rounded-xl border border-green-200 font-medium">{message}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* БЛОК 1: Мой Гараж */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center">🚘 Мои автомобили</h2>
              {cars.length === 0 ? (
                <p className="text-gray-400 text-sm py-4">В вашем гараже пока нет автомобилей. Добавьте первый автомобиль справа.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cars.map((car) => (
                    <div key={car.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 hover:border-blue-300 transition">
                      <div className="font-bold text-slate-800 text-lg">{car.brand_model}</div>
                      <div className="inline-block mt-2 px-3 py-1 bg-white border border-slate-300 rounded text-sm font-mono tracking-wider text-slate-700 shadow-sm">
                        {car.license_plate}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* БЛОК 2: Форма Записи */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-700 mb-4">📅 Онлайн-запись и electronic талон</h2>
              <form onSubmit={handleCreateAppointment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Выберите автомобиль</label>
                  <select value={selectedCarId} onChange={e => setSelectedCarId(e.target.value)} required
                    className="mt-1 block w-full p-3 bg-slate-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Выберите машину --</option>
                    {cars.map(c => <option key={c.id} value={c.id}>{c.brand_model} ({c.license_plate})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Услуга (Прайс-лист)</label>
                  <select value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} required
                    className="mt-1 block w-full p-3 bg-slate-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Выберите услугу --</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.title} — {s.price} ₽ ({s.duration_minutes} мин)</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Дата и время приезда</label>
                  <input type="datetime-local" value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)} required
                    className="mt-1 block w-full p-3 bg-slate-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"/>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Номер ремонтного бокса</label>
                  <select value={boxNumber} onChange={e => setBoxNumber(Number(e.target.value))} required
                    className="mt-1 block w-full p-3 bg-slate-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                    {[1, 2, 3, 4, 5].map(num => <option key={num} value={num}>Бокс №{num}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2 pt-2">
                  <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold shadow-md hover:bg-blue-700 transition">
                    Записаться и сгенерировать талон очереди
                  </button>
                </div>
              </form>

              {/* Вывод сгенерированного талона */}
              {ticket && (
                <div className="mt-6 border-2 border-dashed border-blue-300 bg-blue-50 p-6 rounded-xl text-center max-w-sm mx-auto">
                  <div className="text-xs font-bold text-blue-500 uppercase tracking-widest">Ваш электронный талон</div>
                  <div className="text-5xl font-black text-blue-700 my-2">№ {ticket.ticket_number}</div>
                  <div className="text-sm font-semibold text-slate-700">Статус: <span className="text-orange-500">{ticket.status}</span></div>
                  <div className="text-xs text-slate-500 mt-2">Бокс: {ticket.box_number} | Время: {new Date(ticket.date_time).toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>

          {/* БЛОК 3: Добавление машины в гараж */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-fit">
            <h2 className="text-xl font-bold text-slate-700 mb-4">➕ Добавить машину</h2>
            <form onSubmit={handleAddCar} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Марка и модель</label>
                <input type="text" required placeholder="Например: Toyota Camry" value={newBrand} onChange={e => setNewBrand(e.target.value)}
