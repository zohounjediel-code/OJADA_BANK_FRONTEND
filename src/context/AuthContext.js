import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Vérifier si un token est déjà stocké au démarrage
  useEffect(() => {
    const token = localStorage.getItem('ojada_token');
    if (token) {
      authService.getMe()
        .then(data => setUser(data.user))
        .catch(() => localStorage.removeItem('ojada_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loginClient = useCallback(async (email, password) => {
    const data = await authService.loginClient({ email, password });
    localStorage.setItem('ojada_token', data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const loginAdmin = useCallback(async (username, password) => {
    const data = await authService.loginAdmin({ username, password });
    localStorage.setItem('ojada_token', data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (formData) => {
    const data = await authService.register(formData);
    localStorage.setItem('ojada_token', data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await authService.logout(); } catch (_) {}
    localStorage.removeItem('ojada_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, loginClient, loginAdmin, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
};
