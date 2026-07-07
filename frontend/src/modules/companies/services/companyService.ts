import http from '../../../shared/services/http';

export type CompanyData = {
  idempresa: number;
  razao_social: string;
  nome_fantasia: string;
  cnpj?: string | null;
  inscricao_estadual?: string | null;
  email?: string | null;
  telefone?: string | null;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  logo_url?: string | null;
  timezone: string;
  moeda: string;
  idioma: string;
  situacao: number;
  criado_em: string;
  atualizado_em?: string | null;
  stats: {
    branches: number;
    users: number;
    customers: number;
    products: number;
  };
};

export type CompanyPayload = {
  razao_social: string;
  nome_fantasia: string;
  cnpj?: string;
  inscricao_estadual?: string;
  email?: string;
  telefone?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  timezone?: string;
  moeda?: string;
  idioma?: string;
};

export const companyService = {
  show: async () =>
    (await http.get<{ data: CompanyData }>('/companies')).data.data,
  update: async (payload: CompanyPayload) =>
    (await http.put('/companies', payload)).data,
};
