'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authStorage, type JwtClaims } from '@/lib/auth';

type AuthContextValue = {
  claims: JwtClaims | null;
  /** `false` até a primeira leitura do localStorage no client. */
  ready: boolean;
  /** Relê o token do localStorage (chamar após login). */
  refresh: () => void;
  /** Limpa o token e o estado (chamar no logout). */
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [claims, setClaims] = useState<JwtClaims | null>(null);
  const [ready, setReady] = useState(false);

  // Hidrata no client após a montagem (localStorage não existe no SSR).
  useEffect(() => {
    setClaims(authStorage.getClaims());
    setReady(true);
    function onStorage() {
      setClaims(authStorage.getClaims());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const refresh = useCallback(() => setClaims(authStorage.getClaims()), []);
  const logout = useCallback(() => {
    authStorage.clear();
    setClaims(null);
  }, []);

  const value = useMemo(
    () => ({ claims, ready, refresh, logout }),
    [claims, ready, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  }
  return ctx;
}
