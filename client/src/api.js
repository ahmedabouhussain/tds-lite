import axios from 'axios';
const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(c => {
  const token = localStorage.getItem('tds_token');
  if (token) c.headers.Authorization = `Bearer ${token}`;
  return c;
});
api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('tds_token');
    if (!location.pathname.includes('/login')) location.href = '/login';
  }
  return Promise.reject(err);
});
export default api;
