// frontend/src/pages/QueueMonitor.tsx
import React, { useState, useEffect } from 'react';
import API from '../../api';

interface Appointment {
  id: number;
  car_id: number;
  service_id: number;
  mechanic_id: number;
  date_time: string;
  box_number: number;
  ticket_number: number;
  status: 'ожидает' | 'в работе' | 'готова';
}

export const QueueMonitor: React.FC = () => {
  const [queue, setQueue] = useState<Appointment[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Загрузка активной очереди на сегодня (GET /queue)
  const fetchQueue = async () => {
    try {
      const response = await API.get('/queue');
      setQueue(response.data);
    } catch (err: any) {
      console.error('Ошибка при обновлении очереди:', err);
      setError('Не удалось загрузить данные электронной очереди.');
    }
  };

  // Автообновление данных каждые 5 секунд (как на реальном вокзале/сервисе)
  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  // Изменение статуса ремонта мастером (PATCH /appointments/{id}/status)
  const handleStatusChange = async (appointmentId: number, newStatus: string) => {
    setError('');
    setMessage('');
    try {
      await API.patch(`/appointments/${appointmentId}/status?new_status=${encodeURIComponent(newStatus)}`);
      setMessage(`Статус талона №${appointmentId} успешно изменен на "${newStatus}"!`);
      fetchQueue(); // Сразу обновляем экран
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Не удалось обновить статус записи.');
    }
  };

  // Группируем записи по статусам для наглядного вывода на телевизор
  const waitingOrders = queue.filter(item => item.status === 'ожидает');
  const inProgressOrders = queue.filter(item => item.status === 'в работе');
  const readyOrders = queue.filter(item => item.status === 'готова');

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Шапка Табло */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center shadow-xl">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              🖥️ ОНЛАЙН-ТАБЛО ЭЛЕКТРОННОЙ ОЧЕРЕДИ
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Текущие записи автосервиса «АвтоБосс» на сегодня. Данные обновляются автоматически.
            </p>
          </div>
          <button onClick={fetchQueue} className="mt-4 md:mt-0 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-5 rounded-xl transition text-sm shadow-lg shadow-blue-500/20">
            🔄 Обновить сейчас
          </button>
        </div>

        {error && <div className="bg-red-950/50 border border-red-800 text-red-400 p-4 rounded-xl font-medium">{error}</div>}
        {message && <div className="bg-emerald-950/50 border border-emerald-800 text-emerald-400 p-4 rounded-xl font-medium">{message}</div>}

        {/* ОСНОВНОЙ МОНИТОР ОЧЕРЕДИ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* СТОЛБЕЦ 1: Ожидают (Красная зона) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-xl font-extrabold text-rose-500 flex items-center gap-2">⏱️ ОЖИДАЮТ ВЫЗОВА</h2>
              <span className="bg-rose-500/10 text-rose-400 font-bold px-3 py-0.5 rounded-full text-xs">{waitingOrders.length}</span>
            </div>
            <div className="space-y-3">
              {waitingOrders.map(item => (
                <div key={item.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between hover:border-rose-500/30 transition">
                  <div className="flex justify-between items-center">
                    <span className="text-3xl font-black text-rose-500">ТАЛОН {item.ticket_number}</span>
                    <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 font-mono">Бокс №{item.box_number}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-2 font-medium">Время слота: {new Date(item.date_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  
                  {/* Кнопки мастера */}
                  <div className="mt-4 pt-3 border-t border-slate-900 flex gap-2">
                    <button onClick={() => handleStatusChange(item.id, 'в работе')} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition">
                      ▶️ Взять в работу
                    </button>
                  </div>
                </div>
              ))}
              {waitingOrders.length === 0 && <p className="text-slate-500 text-sm text-center py-6">Очередь пуста</p>}
            </div>
          </div>

          {/* СТОЛБЕЦ 2: В работе (Желтая зона) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-xl font-extrabold text-amber-500 flex items-center gap-2">🛠️ СЕЙЧАС В РАБОТЕ</h2>
              <span className="bg-amber-500/10 text-amber-400 font-bold px-3 py-0.5 rounded-full text-xs">{inProgressOrders.length}</span>
            </div>
            <div className="space-y-3">
              {inProgressOrders.map(item => (
                <div key={item.id} className="bg-slate-950 border border-amber-500/20 p-4 rounded-xl flex flex-col justify-between shadow-md shadow-amber-500/5 animate-pulse">
                  <div className="flex justify-between items-center">
                    <span className="text-3xl font-black text-amber-400">ТАЛОН {item.ticket_number}</span>
                    <span className="text-xs bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded text-amber-400 font-mono">Бокс №{item.box_number}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-2 font-medium">Ремонт запущен. Ждем завершения...</div>
                  
                  {/* Кнопки мастера */}
                  <div className="mt-4 pt-3 border-t border-slate-900 flex gap-2">
                    <button onClick={() => handleStatusChange(item.id, 'готова')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition">
                      ✅ Готово к выдаче
                    </button>
                  </div>
                </div>
              ))}
              {inProgressOrders.length === 0 && <p className="text-slate-500 text-sm text-center py-6">Сейчас ремонт не ведется</p>}
            </div>
          </div>

          {/* СТОЛБЕЦ 3: Готовы к выдаче (Зеленая зона) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-xl font-extrabold text-emerald-500 flex items-center gap-2">🎉 ГОТОВЫ К ВЫДАЧЕ</h2>
              <span className="bg-emerald-500/10 text-emerald-400 font-bold px-3 py-0.5 rounded-full text-xs">{readyOrders.length}</span>
            </div>
            <div className="space-y-3">
              {readyOrders.map(item => (
                <div key={item.id} className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-xl flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-3xl font-black text-emerald-400">ТАЛОН {item.ticket_number}</span>
                    <span className="text-xs bg-emerald-500/20 px-2 py-1 rounded text-emerald-400 font-mono">Бокс №{item.box_number}</span>
                  </div>
                  <div className="text-xs text-emerald-400 font-bold mt-2">✨ Машина отремонтирована!</div>
                  
                  {/* Возврат в очередь при необходимости */}
                  <div className="mt-4 pt-2 border-t border-slate-900 flex gap-2">
                    <button onClick={() => handleStatusChange(item.id, 'ожидает')} className="text-[10px] text-slate-500 hover:text-slate-400 underline transition">
                      Вернуть в ожидает
                    </button>
                  </div>
                </div>
              ))}
              {readyOrders.length === 0 && <p className="text-slate-500 text-sm text-center py-6">Готовых машин пока нет</p>}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
