import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('hostelbarter_user');
    const savedToken = localStorage.getItem('hostelbarter_token');
    if (!savedUser || !savedToken || savedToken.startsWith('demo_token_')) {
      localStorage.removeItem('hostelbarter_user');
      localStorage.removeItem('hostelbarter_token');
      setLoading(false);
      return;
    }

    try {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    } catch {
      localStorage.removeItem('hostelbarter_user');
      localStorage.removeItem('hostelbarter_token');
      setLoading(false);
      return;
    }

    // Refresh role/status from MariaDB so promotion, demotion, suspension,
    // and account deletion are reflected on page refresh.
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${savedToken}` } })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          localStorage.setItem('hostelbarter_user', JSON.stringify(data.user));
        } else if (res.status === 401 || res.status === 403) {
          setUser(null);
          setToken(null);
          localStorage.removeItem('hostelbarter_user');
          localStorage.removeItem('hostelbarter_token');
        }
      })
      .catch(() => {
        // Keep the saved session if the server is temporarily unreachable.
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('hostelbarter_user', JSON.stringify(userData));
    localStorage.setItem('hostelbarter_token', authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('hostelbarter_user');
    localStorage.removeItem('hostelbarter_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
