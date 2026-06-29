import axios, { type AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8085';
const TOKEN_KEY = 'platform_access_token';
const REFRESH_KEY = 'platform_refresh_token';
const EXP_KEY = 'platform_token_exp';
const USER_KEY = 'platform_auth_user';

export type PlatformUser = {
  idplatform_usuario: number;
  nome: string;
  email: string;
  telefone?: string | null;
  cargo?: string | null;
  nivel_acesso: string;
};

type LoginResponse = {
  success: boolean;
  data: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    auth_user: PlatformUser;
  };
};

export const platformSession = {
  token: () => localStorage.getItem(TOKEN_KEY),
  refreshToken: () => localStorage.getItem(REFRESH_KEY),
  valid: () => Number(localStorage.getItem(EXP_KEY) || 0) > Date.now() / 1000,
  user: (): PlatformUser | null => {
    try {
      return JSON.parse(
        localStorage.getItem(USER_KEY) || 'null'
      ) as PlatformUser | null;
    } catch {
      return null;
    }
  },
  save: (data: LoginResponse['data']) => {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_KEY, data.refresh_token);
    localStorage.setItem(EXP_KEY, String(Date.now() / 1000 + data.expires_in));
    localStorage.setItem(USER_KEY, JSON.stringify(data.auth_user));
  },
  clear: () => {
    [TOKEN_KEY, REFRESH_KEY, EXP_KEY, USER_KEY].forEach(key =>
      localStorage.removeItem(key)
    );
  },
};

export const platformApi = axios.create({
  baseURL: `${BASE_URL}/api/platform`,
  headers: { 'Content-Type': 'application/json' },
});

platformApi.interceptors.request.use(config => {
  const token = platformSession.token();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

platformApi.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/')
    ) {
      platformSession.clear();
      window.location.href = '/platform/login';
    }
    return Promise.reject(error);
  }
);

export async function platformLogin(email: string, senha: string) {
  const response = await axios.post<LoginResponse>(
    `${BASE_URL}/api/platform/auth/login`,
    { email, senha }
  );
  platformSession.save(response.data.data);
  return response.data.data;
}

export function apiError(error: unknown): string {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return (
      error.response?.data?.error || 'Nao foi possivel concluir a operacao.'
    );
  }
  return error instanceof Error ? error.message : 'Erro inesperado.';
}
