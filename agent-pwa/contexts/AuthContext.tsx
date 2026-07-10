'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken, setToken, setStoredUser, removeToken, getStoredUser } from '@/lib/auth';
import type { User } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = getToken();
    const storedUser = getStoredUser();
    if (storedToken && storedUser) {
      setTokenState(storedToken);
      setUser(storedUser);
      // Verify token is still valid in background
      api.getProfile()
        .then((profile) => {
          setUser(profile);
          setStoredUser(profile);
        })
        .catch(() => {
          removeToken();
          setTokenState(null);
          setUser(null);
          router.replace('/login');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [router]);

  const login = useCallback(async (phone: string, password: string) => {
    const { access_token } = await api.login(phone, password);
    setToken(access_token);
    setTokenState(access_token);
    // Fetch full profile with all relations (pollingUnit, ward, lga)
    const profile = await api.getProfile();
    setStoredUser(profile);
    setUser(profile);
    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(() => {
    removeToken();
    setTokenState(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
