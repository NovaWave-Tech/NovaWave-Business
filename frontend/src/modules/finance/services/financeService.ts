import http from '../../../shared/services/http';
import type { FinanceForm } from '../schemas/financeSchema';

export type FinanceType = 'revenue' | 'expense';
export type Option = { id: number; nome: string; tipo?: number };
export type Movement = {
  type: FinanceType;
  id: number;
  descricao: string;
  valor: number;
  total: number;
  due_date: string;
  settlement_date?: string;
  situacao: number;
  status_key: 'pending' | 'overdue' | 'settled' | 'cancelled';
  categoria?: string;
  centro_custo?: string;
  conta?: string;
  forma_pagamento?: string;
  documento?: string;
  observacoes?: string;
  filial?: string;
  party?: string;
  juros: number;
  desconto: number;
  multa: number;
  parcela_numero: number;
  parcelas_total: number;
  recorrente: boolean;
  criado_em: string;
};

export type FinanceData = {
  period: { start: string; end: string };
  kpis: {
    current_balance: number;
    projected_balance: number;
    month_revenue: number;
    month_expense: number;
    cash_flow: number;
    receivable: number;
    payable: number;
    bank_initial: number;
    previous_revenue: number;
    previous_expense: number;
  };
  chart: Array<{
    day: string;
    revenue: number;
    expense: number;
    balance: number;
  }>;
  movements: Movement[];
  payable: {
    pending: number;
    today: number;
    tomorrow: number;
    overdue: number;
  };
  receivable: {
    pending: number;
    today: number;
    overdue: number;
    expected: number;
  };
  banks: Array<{
    idconta_bancaria: number;
    banco: string;
    agencia?: string;
    conta: string;
    balance: number;
    last_movement?: string;
  }>;
  cards: Array<{
    idcartao: number;
    banco: string;
    descricao: string;
    final_cartao?: string;
    limite: number;
    invoice: number;
    available: number;
    next_due?: string;
  }>;
  goal: { value: number; percentage: number };
  insights: Array<{
    tone: 'success' | 'warning' | 'danger';
    title: string;
    description: string;
  }>;
  options: {
    categories: Option[];
    cost_centers: Option[];
    banks: Option[];
    branches: Option[];
    customers: Option[];
    suppliers: Option[];
  };
};

export type FinanceDetail = Movement & {
  data_vencimento: string;
  idcategoria_financeira: number;
  idcentro_custo: number;
  idconta_bancaria: number;
  idfilial?: number;
  idcliente?: number;
  idfornecedor?: number;
  attachments: Array<{
    idanexo: number;
    nome: string;
    url: string;
    criado_em: string;
  }>;
  history: Array<{ idauditoria: number; acao: string; criado_em: string }>;
};

export const financeService = {
  list: async (params: Record<string, string>) =>
    (await http.get<{ data: FinanceData }>('/finance', { params })).data.data,
  detail: async (type: FinanceType, id: number) =>
    (await http.get<{ data: FinanceDetail }>(`/finance/${type}/${id}`)).data
      .data,
  create: async (type: FinanceType, payload: FinanceForm) =>
    (await http.post(`/finance/${type}`, payload)).data,
  update: async (type: FinanceType, id: number, payload: FinanceForm) =>
    (await http.put(`/finance/${type}/${id}`, payload)).data,
  status: async (type: FinanceType, id: number, situacao: number) =>
    (await http.patch(`/finance/${type}/${id}/status`, { situacao })).data,
  duplicate: async (type: FinanceType, id: number) =>
    (await http.post(`/finance/${type}/${id}/duplicate`)).data,
};
