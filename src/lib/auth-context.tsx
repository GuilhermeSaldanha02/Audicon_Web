'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api, type ApiEnvelope } from '@/lib/api';
import type { AuthClaims } from '@/lib/types';

type AuthContextValue = {
  claims: AuthClaims | null;
  /** `false` até a primeira tentativa de hidratação via /auth/profile. */
  ready: boolean;
  /**
   * (Re)busca os claims em GET /auth/profile — fonte única de verdade (o cookie
   * httpOnly não é legível por JS). Chamar após login. Retorna os claims (ou
   * null se não autenticado) para uso imediato sem esperar o re-render.
   */
  refresh: () => Promise<AuthClaims | null>;
  /** Chama POST /auth/logout (limpa o cookie no back) e zera o estado. */
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [claims, setClaims] = useState<AuthClaims | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async (): Promise<AuthClaims | null> => {
    try {
      const res = await api.get<ApiEnvelope<AuthClaims>>('/auth/profile');
      setClaims(res.data.data);
      return res.data.data;
    } catch {
      // 401 (não autenticado) ou erro de rede → sem sessão.
      setClaims(null);
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Mesmo se a chamada falhar, descarta o estado local.
    }
    setClaims(null);
  }, []);

  // Hidrata uma vez na montagem (o cookie, se existir, vai via withCredentials).
  useEffect(() => {
    void (async () => {
      await refresh();
      setReady(true);
    })();
  }, [refresh]);

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
