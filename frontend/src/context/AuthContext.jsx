import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('zydex_token');
    if (token) {
      api('/auth/me')
        .then((data) => setUser(data.user))
        .catch(() => localStorage.removeItem('zydex_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem('zydex_token', data.token);
    setUser(data.user);
    return data;
  };

  const signup = async (form) => {
    const data = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    localStorage.setItem('zydex_token', data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('zydex_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, setUser, isAdmin: user?.role === 'ADMIN' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
