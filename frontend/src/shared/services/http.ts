import axios, { AxiosError, type AxiosInstance } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8085';

export type AuthUser = {
  idusuario: number;
  nome: string;
  email: string;
  situacao: number;
  company_id?: number | null;
  branch_id?: number | null;
  admin_empresa?: boolean;
  /** Permissoes "modulo:acao"; admin recebe o curinga "*". */
  permissions?: string[];
};

export const getToken = (): string | null => localStorage.getItem('auth_token');

export const isTokenValid = (): boolean => {
  const expiresAt = localStorage.getItem('auth_token_exp');

  if (!expiresAt) {
    return false;
  }

  return Number(expiresAt) > Date.now() / 1000;
};

export const saveAuth = (
  token: string,
  expiresIn: number,
  user: AuthUser
): void => {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_token_exp', String(Date.now() / 1000 + expiresIn));
  localStorage.setItem('auth_user', JSON.stringify(user));
};

export const clearAuth = (): void => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_token_exp');
  localStorage.removeItem('auth_user');
};

export const getUser = (): AuthUser | null => {
  const rawUser = localStorage.getItem('auth_user');

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    clearAuth();
    return null;
  }
};

const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use(config => {
  const token = getToken();

  if (token && isTokenValid()) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

http.interceptors.response.use(
  response => response,
  (error: AxiosError<{ error?: string; message?: string }>) => {
    const status = error.response?.status;

    // 401 = sessao invalida (logout); 403 = sem permissao (a tela mostra a
    // mensagem da API, sem derrubar a sessao do usuario).
    if (status === 401) {
      clearAuth();

      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    // Substitui a mensagem generica do axios ("Request failed with status
    // code 422") pela mensagem amigavel retornada pela API.
    const apiMessage =
      error.response?.data?.error || error.response?.data?.message;
    if (apiMessage) {
      error.message = apiMessage;
    }

    return Promise.reject(error);
  }
);

export default http;
