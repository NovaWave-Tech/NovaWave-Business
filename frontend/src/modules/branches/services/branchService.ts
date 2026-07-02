import http from '../../../shared/services/http';

export type Option = { id?: number; nome: string };
export type Branch = {
  idfilial: number;
  nome: string;
  codigo: string;
  cnpj?: string;
  inscricao_estadual?: string;
  email?: string;
  telefone?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade: string;
  estado: string;
  matriz: boolean;
  idgerente?: number;
  gerente?: string;
  latitude?: number;
  longitude?: number;
  permite_estoque_negativo: boolean;
  caixa_obrigatorio: boolean;
  situacao: number;
  criado_em: string;
  atualizado_em: string;
  usuarios: number;
  receita_mes: number;
  receita_dia: number;
  pedidos: number;
  clientes: number;
  ticket_medio: number;
  produtos_estoque: number;
  estoque_critico: number;
  ultima_movimentacao?: string;
};

export type BranchList = {
  branches: Branch[];
  metrics: {
    total: number;
    active: number;
    inactive: number;
    matrix?: string;
    users: number;
    revenue: number;
  };
  options: {
    company: { idempresa: number; nome: string };
    cities: Option[];
    states: Option[];
    managers: Array<Option & { id: number }>;
  };
};

export type BranchDetail = Branch & {
  empresa: string;
  monthly_goal?: number;
  indicators: {
    revenue_today: number;
    revenue_month: number;
    orders: number;
    average_ticket: number;
    customers: number;
    products: number;
    critical: number;
    open_cash: number;
    current_cash: number;
  };
  users: Array<{
    idusuario: number;
    nome: string;
    email: string;
    cargo?: string;
    perfil: string;
    situacao: number;
    ultimo_login?: string;
  }>;
  operation: {
    last_sale?: string;
    last_purchase?: string;
    last_stock?: string;
    linked_accounts: number;
  };
  history: Array<{
    idauditoria: number;
    acao: string;
    criado_em: string;
  }>;
};

export type BranchPayload = {
  nome: string;
  codigo: string;
  cnpj?: string;
  inscricao_estadual?: string;
  email?: string;
  telefone?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade: string;
  estado: string;
  matriz: boolean;
  idgerente?: number;
  latitude?: number;
  longitude?: number;
  permite_estoque_negativo: boolean;
  caixa_obrigatorio: boolean;
  situacao: boolean;
  meta_mensal?: number;
};

export const branchService = {
  list: async (params: Record<string, string>) =>
    (await http.get<{ data: BranchList }>('/branches', { params })).data.data,
  detail: async (id: number) =>
    (await http.get<{ data: BranchDetail }>(`/branches/${id}`)).data.data,
  create: async (payload: BranchPayload) =>
    (await http.post('/branches', payload)).data,
  update: async (id: number, payload: BranchPayload) =>
    (await http.put(`/branches/${id}`, payload)).data,
  status: async (id: number, situacao: number) =>
    (await http.patch(`/branches/${id}/status`, { situacao })).data,
  matrix: async (id: number) =>
    (await http.patch(`/branches/${id}/matrix`)).data,
};
