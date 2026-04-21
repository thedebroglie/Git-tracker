import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('gt_token'));
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await authAPI.me();
      setUser(res.data.student);
    } catch {
      localStorage.removeItem('gt_token');
      localStorage.removeItem('gt_student');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const completeOAuthLogin = (newToken, student) => {
    localStorage.setItem('gt_token', newToken);
    localStorage.setItem('gt_student', JSON.stringify(student));
    setToken(newToken);
    setUser(student);
  };

  const logout = () => {
    localStorage.removeItem('gt_token');
    localStorage.removeItem('gt_student');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await authAPI.me();
      setUser(res.data.student);
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, logout, refreshUser, completeOAuthLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
