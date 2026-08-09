import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, tokenStorage, extractApiErrorMessage } from '../lib/api';
import type { ApiEnvelope, AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // عند تحميل التطبيق: إن وُجد refresh token محفوظ سابقاً، نحاول استعادة
  // الجلسة تلقائياً بدل إجبار المستخدم على تسجيل الدخول من جديد في كل مرة
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await api.post<ApiEnvelope<{ accessToken: string }>>('/auth/refresh', { refreshToken });
        const token = data.data.accessToken;
        tokenStorage.setAccessToken(token);

        const meResponse = await api.get<ApiEnvelope<AuthUser>>('/auth/me');
        if (!cancelled) {
          setAccessToken(token);
          setUser(meResponse.data.data);
        }
      } catch {
        tokenStorage.clear();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await api.post<ApiEnvelope<{ accessToken: string; refreshToken: string; user: AuthUser }>>(
        '/auth/login',
        { email, password },
      );
      tokenStorage.setAccessToken(data.data.accessToken);
      tokenStorage.setRefreshToken(data.data.refreshToken);
      setAccessToken(data.data.accessToken);
      setUser(data.data.user);
    } catch (err) {
      throw new Error(extractApiErrorMessage(err, 'Login failed'));
    }
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, accessToken, isLoading, login, logout }),
    [user, accessToken, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
