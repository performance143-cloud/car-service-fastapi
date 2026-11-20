// frontend/src/pages/Auth.tsx
import React, { useState } from 'react';
import API from '../../api';

interface AuthProps {
  onLoginSuccess: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (isRegister) {
        // Регистрация клиента (schemas.ClientRegister)
        await API.post('/auth/register', { email, password, name, phone });
        setMessage('Регистрация успешна! Теперь вы можете войти.');
        setIsRegister(false);
      } else {
        // Логин (schemas.UserLogin)
        const response = await API.post('/auth/login', { email, password });
        localStorage.setItem('token', response.data.access_token);
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка доступа. Проверьте введенные данные.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <h2 className="text-3xl font-extrabold text-center text-slate-800 mb-2">
          🚗 АвтоБосс
        </h2>
        <p className="text-center text-gray-500 mb-6 text-sm">
          {isRegister ? 'Регистрация профиля клиента' : 'Система управления автосервисом'}
        </p>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium border border-red-200">{error}</div>}
        {message && <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm font-medium border border-green-200">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Email адрес</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Пароль</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
          </div>

          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Ваше имя</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)}
                  className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Номер телефона</label>
                <input type="text" required value={phone} onChange={e => setPhone(e.target.value)}
                  className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
              </div>
            </>
          )}

          <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold shadow-lg hover:bg-blue-700 hover:shadow-blue-500/20 transition-all duration-200">
            {isRegister ? 'Создать аккаунт' : 'Войти'}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-gray-100 pt-4">
          <button onClick={() => { setIsRegister(!isRegister); setError(''); setMessage(''); }} className="text-sm font-medium text-blue-600 hover:text-blue-500 transition">
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Новый клиент? Зарегистрироваться'}
          </button>
        </div>
      </div>
    </div>
  );
};
