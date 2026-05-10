import React, { createContext, useContext, useEffect, useState } from 'react';
import api from './api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('tds_token');
    const stored = localStorage.getItem('tds_user');
    if (token && stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('tds_token', data.token);
    localStorage.setItem('tds_user', JSON.stringify(data.user));
    setUser(data.user);
  };
  const logout = () => {
    localStorage.removeItem('tds_token'); localStorage.removeItem('tds_user');
    setUser(null); window.location.href = '/login';
  };
  return <Ctx.Provider value={{ user, login, logout, loading }}>{children}</Ctx.Provider>;
}
