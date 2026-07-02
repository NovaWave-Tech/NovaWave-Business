import http from '../../../shared/services/http';

export type UserOption = { id: number; nome: string; iddepartamento?: number };
export type UserRow = {
  idusuario: number;
  nome: string;
  email: string;
  telefone?: string;
  avatar_url?: string;
  admin_empresa: boolean;
  situacao: number;
  ultimo_login?: string;
  criado_em: string;
  filial?: string;
  cargo?: string;
  departamento?: string;
  perfil: string;
};
export type UserListData = {
  users: UserRow[];
  metrics: {
    total: string;
    active: string;
    inactive: string;
    admins: string;
    branches: string;
  };
  options: {
    company: { idempresa: number; nome: string };
    branches: UserOption[];
    departments: UserOption[];
    roles: UserOption[];
    profiles: Array<UserOption & { descricao?: string }>;
  };
};
export type UserDetail = UserRow & {
  idfilial_padrao?: number;
  idfuncionario?: number;
  empresa: string;
  cpf?: string;
  birth_date?: string;
  exigir_troca_senha: boolean;
  dois_fatores_ativo: boolean;
  idcargo?: number;
  iddepartamento?: number;
  data_admissao?: string;
  profiles: UserOption[];
  permissions: Array<{ modulo: string }>;
  branches: UserOption[];
  sessions: Array<{
    idsessao: number;
    dispositivo?: string;
    sistema_operacional?: string;
    navegador?: string;
    ip?: string;
    criado_em: string;
    expira_em: string;
    revogado_em?: string;
    active: boolean;
  }>;
  history: Array<{
    idauditoria: number;
    acao: string;
    valores_anteriores?: unknown;
    valores_novos?: unknown;
    ip?: string;
    criado_em: string;
  }>;
};

export type UserPayload = {
  nome: string;
  cpf?: string;
  telefone?: string;
  birth_date?: string;
  email: string;
  idfilial: number;
  filiais?: number[];
  iddepartamento?: number;
  idcargo?: number;
  idperfil?: number;
  senha?: string;
  admin_empresa?: boolean;
  force_password_change?: boolean;
  two_factor_enabled?: boolean;
};

export const userService = {
  list: async (params: Record<string, string>) =>
    (await http.get<{ data: UserListData }>('/users', { params })).data.data,
  detail: async (id: number) =>
    (await http.get<{ data: UserDetail }>(`/users/${id}`)).data.data,
  create: async (payload: UserPayload) =>
    (await http.post(`/users`, payload)).data,
  update: async (id: number, payload: UserPayload) =>
    (await http.put(`/users/${id}`, payload)).data,
  setStatus: async (id: number, situacao: number) =>
    (await http.patch(`/users/${id}/status`, { situacao })).data,
  resetPassword: async (id: number, senha: string) =>
    (await http.post(`/users/${id}/reset-password`, { senha })).data,
  revokeSession: async (userId: number, sessionId: number) =>
    (await http.delete(`/users/${userId}/sessions/${sessionId}`)).data,
};
