import axios, { AxiosError } from 'axios';

// R-08: o JWT vive em cookie httpOnly. `withCredentials` faz o axios enviar o
// cookie em requests cross-origin; nenhum header Authorization é montado no
// front (o browser anexa o cookie automaticamente).
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Sessão expirada/ausente: não há token local para limpar (cookie httpOnly).
    // Redireciona para /login como rede de segurança (a guarda de rota também
    // trata). Suprime na própria /login para evitar loop com o probe de perfil.
    if (error.response?.status === 401 && typeof window !== 'undefined') {
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
