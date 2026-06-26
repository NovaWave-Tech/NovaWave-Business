import http, { saveAuth, type AuthUser } from '../../../shared/services/http';

type LoginResponse = {
  success?: boolean;
  message?: string;
  data?: {
    token?: string;
    expires_in?: number;
    auth_user?: AuthUser;
  };
  token?: string;
  expires_in?: number;
  auth_user?: AuthUser;
};

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  try {
    const response = await http.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    const body = response.data;
    const token = body.data?.token ?? body.token;
    const expiresIn = body.data?.expires_in ?? body.expires_in ?? 86400;
    const user = body.data?.auth_user ?? body.auth_user;

    if (!token || !user) {
      throw new Error('Resposta de autenticacao invalida');
    }

    saveAuth(token, expiresIn, user);

    return body;
  } catch (error: unknown) {
    const apiMessage = extractLoginErrorMessage(error);

    throw new Error(apiMessage);
  }
}

function extractLoginErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as {
      message?: string;
      response?: {
        data?: {
          error?: string;
          message?: string;
        };
      };
    };

    return (
      candidate.response?.data?.error ||
      candidate.response?.data?.message ||
      candidate.message ||
      'Falha ao realizar login'
    );
  }

  return 'Falha ao realizar login';
}
