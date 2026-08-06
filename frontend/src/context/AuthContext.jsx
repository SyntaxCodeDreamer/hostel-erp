import React, { createContext, useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo && userInfo !== 'undefined' && userInfo !== 'null') {
        setUser(JSON.parse(userInfo));
      } else {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch (e) {
      console.error('Failed to parse userInfo from localStorage:', e);
      localStorage.removeItem('userInfo');
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      if (data?.token) {
        localStorage.setItem('token', data.token);
      }
      return data;
    } catch (error) {
      throw error.message || 'Login failed';
    }
  };

  const logout = () => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
