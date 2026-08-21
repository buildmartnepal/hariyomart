import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
type User = { id: string; name: string; email?: string; role: string; tenantId?: string };
type Ctx = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  demoLogin: (email: string) => Promise<User>;
  registerBuyer: (p: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  apiRequest: <T = any>(path: string, init?: RequestInit) => Promise<T>;
};
const C = createContext<Ctx | null>(null);
const api = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const ACCESS = 'hariyo-mobile-access',
  REFRESH = 'hariyo-mobile-refresh',
  USER = 'hariyo-mobile-user';
const mobileHeaders = { 'x-client-platform': 'mobile' };
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(USER);
        if (raw) setUser(JSON.parse(raw));
      } catch {
      } finally {
        setReady(true);
      }
    })();
  }, []);
  const persist = useCallback(async (data: any) => {
    if (data.accessToken) await SecureStore.setItemAsync(ACCESS, data.accessToken);
    if (data.refreshToken) await SecureStore.setItemAsync(REFRESH, data.refreshToken);
    if (data.user) {
      await SecureStore.setItemAsync(USER, JSON.stringify(data.user));
      setUser(data.user);
    }
    return data.user as User;
  }, []);
  const logout = useCallback(async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH);
    try {
      await fetch(`${api}/auth/logout`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...mobileHeaders },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {}
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS),
      SecureStore.deleteItemAsync(REFRESH),
      SecureStore.deleteItemAsync(USER),
    ]);
    setUser(null);
  }, []);
  const renew = useCallback(async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH);
    if (!refreshToken) throw new Error('Session expired');
    const r = await fetch(`${api}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...mobileHeaders },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Session expired');
    await persist(data);
    return data.accessToken as string;
  }, [persist]);
  const apiRequest = useCallback(
    async <T,>(path: string, init: RequestInit = {}) => {
      let token = await SecureStore.getItemAsync(ACCESS);
      const call = (t: string | null) =>
        fetch(`${api}${path}`, {
          ...init,
          headers: {
            ...(init.body ? { 'content-type': 'application/json' } : {}),
            ...mobileHeaders,
            ...(init.headers || {}),
            ...(t ? { authorization: `Bearer ${t}` } : {}),
          },
        });
      let r = await call(token);
      if (r.status === 401) {
        try {
          token = await renew();
          r = await call(token);
        } catch {
          await logout();
        }
      }
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
      return data as T;
    },
    [logout, renew],
  );
  const login = useCallback(
    async (email: string, password: string) => {
      const r = await fetch(`${api}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...mobileHeaders },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Sign in failed');
      return persist(data);
    },
    [persist],
  );
  const demoLogin = useCallback(
    async (email: string) => {
      const r = await fetch(`${api}/auth/demo-session`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...mobileHeaders },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Demo workspace is unavailable');
      return persist(data);
    },
    [persist],
  );
  const registerBuyer = useCallback(
    async (p: { name: string; email: string; password: string; phone?: string }) => {
      const r = await fetch(`${api}/auth/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...mobileHeaders },
        body: JSON.stringify(p),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Registration failed');
      return persist(data);
    },
    [persist],
  );
  const value = useMemo(
    () => ({ user, ready, login, demoLogin, registerBuyer, logout, apiRequest }),
    [user, ready, login, demoLogin, registerBuyer, logout, apiRequest],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}
export function useAuth() {
  const c = useContext(C);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}
