// frontend/src/api/index.ts
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://127.0.0.1:8000', // Адрес вашего запущенного FastAPI
  headers: {
    'Content-Type': 'application/json',
  },
});

// Перехватчик: автоматически добавляем токен в заголовки, если он есть в хранилище
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
