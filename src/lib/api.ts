import axios, { AxiosError } from 'axios';
import { authStorage } from './auth';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = authStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      authStorage.clear();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

/**
 * Extrai a mensagem de erro de uma falha do axios (campo `response.data.message`
 * do backend), com fallbacks para erros de rede e mensagem padrão.
 */
export function getErrorMessage(err: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  const axiosErr = err as {
    response?: { data?: { message?: unknown } };
    code?: string;
  };
  const message = axiosErr?.response?.data?.message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
  if (axiosErr?.code === 'ERR_NETWORK' || axiosErr?.code === 'ECONNREFUSED') {
    return 'Não foi possível conectar ao servidor.';
  }
  return fallback;
}

export type ApiEnvelope<T> = {
  statusCode: number;
  data: T;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};
