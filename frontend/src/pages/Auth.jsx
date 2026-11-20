import React, { useState } from 'react';
import API from '../api';

export function Auth({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (isRegister) {
        await API.post('/auth/register', { email, password, name, phone });
        setMessage('Регистрация успешна! Теперь войдите в аккаунт.');
        setIsRegister(false);
      } else {
        const response = await API.post('/auth/login', { email, password });
        localStorage.setItem('token', response.data.access_token);
        onLoginSuccess();
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Ошибка проверки данных. Проверьте формат полей.');
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="card auth-card">
        <h2 style={{ textAlign: 'center' }}>
          {isRegister ? 'Регистрация клиента' : 'Вход в систему АвтоБосс'}
        </h2>

        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              required
              placeholder="client@mail.ru"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Пароль (минимум 6 символов)</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="******"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {isRegister && (
            <>
              <div className="form-group">
                <label>Ваше имя</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  placeholder="Алексей"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Телефон (например, +79991234567)</label>
                <input
                  type="text"
                  required
                  placeholder="+79991234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary">
            {isRegister ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </form>

        <button
          type="button"
          className="btn btn-link"
          onClick={() => {
            setIsRegister(!isRegister);
            setError('');
            setMessage('');
          }}
        >
          {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
        </button>
      </div>
    </div>
  );
}
