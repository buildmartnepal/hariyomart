'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type HariyoUser = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  tenantId?: string;
  isVerified?: boolean;
};
type AuthResponse = {
  user: HariyoUser & { _id?: string };
  error?: string;
};
type AuthContextValue = {
  user: HariyoUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<HariyoUser>;
  registerBuyer: (payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<HariyoUser>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<HariyoUser | null>;
  apiRequest: <T = any>(path: string, init?: RequestInit) => Promise<T>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<HariyoUser | null>(null);
  const [ready, setReady] = useState(false);
  const api = process.env.NEXT_PUBLIC_API_URL || '/api';
  const refreshMe = useCallback(async () => {
    try {
      const r = await fetch(`${api}/auth/me`, { credentials: 'include', cache: 'no-store' });
      if (!r.ok) {
        setUser(null);
        return null;
      }
      const data = (await r.json()) as AuthResponse,
        u = { ...data.user, id: String(data.user?.id || data.user?._id) } as HariyoUser;
      setUser(u);
      return u;
    } catch {
      setUser(null);
      return null;
    }
  }, [api]);
  useEffect(() => {
    refreshMe().finally(() => setReady(true));
  }, [refreshMe]);
  const renew = useCallback(async () => {
    const r = await fetch(`${api}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    if (!r.ok) throw new Error('Session expired');
    const data = (await r.json()) as AuthResponse;
    if (data.user) setUser(data.user);
    return true;
  }, [api]);
  const logout = useCallback(async () => {
    try {
      await fetch(`${api}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
    } finally {
      setUser(null);
    }
  }, [api]);
  const apiRequest = useCallback(
    async <T,>(path: string, init: RequestInit = {}) => {
      const call = () =>
        fetch(`${api}${path}`, {
          ...init,
          credentials: 'include',
          headers: {
            ...(init.body && !(init.body instanceof FormData)
              ? { 'content-type': 'application/json' }
              : {}),
            ...(init.headers || {}),
          },
        });
      let r = await call();
      if (r.status === 401) {
        try {
          await renew();
          r = await call();
        } catch {
          await logout();
        }
      }
      const text = await r.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text };
      }
      if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
      return data as T;
    },
    [api, logout, renew],
  );
  const login = useCallback(
    async (email: string, password: string) => {
      const r = await fetch(`${api}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await r.json()) as AuthResponse;
      if (!r.ok) throw new Error(data.error || 'Unable to sign in');
      setUser(data.user);
      return data.user as HariyoUser;
    },
    [api],
  );
  const registerBuyer = useCallback(
    async (payload: { name: string; email: string; password: string; phone?: string }) => {
      const r = await fetch(`${api}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await r.json()) as AuthResponse;
      if (!r.ok) throw new Error(data.error || 'Unable to create account');
      setUser(data.user);
      return data.user as HariyoUser;
    },
    [api],
  );
  const value = useMemo(
    () => ({ user, ready, login, registerBuyer, logout, refreshMe, apiRequest }),
    [user, ready, login, registerBuyer, logout, refreshMe, apiRequest],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
