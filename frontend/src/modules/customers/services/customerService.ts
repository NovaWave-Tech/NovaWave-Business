import http from '../../../shared/services/http';

export type Customer = {
  idcliente: number;
  tipo_pessoa: number;
  nome: string;
  nome_fantasia?: string;
  rg?: string;
  inscricao_estadual?: string;
  data_nascimento_abertura?: string;
  documento: string;
  email?: string;
  telefone?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  limite_credito: number;
  situacao: number;
  recorrente: boolean;
  permite_venda_prazo: boolean;
  criado_em: string;
  atualizado_em?: string;
  purchases: number;
  total_bought: number;
  average_ticket: number;
  last_purchase?: string;
  overdue: number;
  open_balance: number;
};

export type CustomerList = {
  customers: Customer[];
  metrics: {
    total: number;
    active: number;
    inactive: number;
    revenue: number;
    buyers: number;
    delinquent: number;
  };
  options: {
    cities: Array<{ nome: string }>;
    states: Array<{ nome: string }>;
  };
};

export type CustomerDetail = Customer & {
  summary: {
    purchases: number;
    total_bought: number;
    average_ticket: number;
    last_purchase?: string;
  };
  sales: Array<{
    idvenda: number;
    data_venda: string;
    valor_total: number;
    situacao: number;
  }>;
  financial: {
    open_balance: number;
    overdue: number;
    upcoming: number;
    last_payment?: string;
  };
  timeline: Array<{
    source: 'audit' | 'sale';
    title: string;
    criado_em: string;
    detail?: string;
  }>;
  latest_note?: string;
};

export type CustomerPayload = {
  tipo_pessoa: number;
  nome: string;
  nome_fantasia?: string;
  rg?: string;
  inscricao_estadual?: string;
  data_nascimento_abertura?: string;
  documento: string;
  email?: string;
  telefone?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  limite_credito: number;
  situacao: boolean;
  recorrente: boolean;
  permite_venda_prazo: boolean;
  observacao?: string;
};

export type CustomerSearchResult = {
  idcliente: number;
  nome: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  situacao: number;
  last_purchase: string | null;
  total_bought: number;
};

export const customerService = {
  list: async (params: Record<string, string>) =>
    (await http.get<{ data: CustomerList }>('/customers', { params })).data
      .data,
  search: async (q: string) =>
    (
      await http.get<{ data: CustomerSearchResult[] }>('/customers/search', {
        params: { q },
      })
    ).data.data,
  detail: async (id: number) =>
    (await http.get<{ data: CustomerDetail }>(`/customers/${id}`)).data.data,
  create: async (payload: CustomerPayload) =>
    (await http.post('/customers', payload)).data,
  update: async (id: number, payload: CustomerPayload) =>
    (await http.put(`/customers/${id}`, payload)).data,
  status: async (id: number, situacao: number) =>
    (await http.patch(`/customers/${id}/status`, { situacao })).data,
  note: async (id: number, observacao: string) =>
    (await http.post(`/customers/${id}/notes`, { observacao })).data,
};
