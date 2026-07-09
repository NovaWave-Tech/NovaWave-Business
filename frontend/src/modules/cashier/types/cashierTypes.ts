export type CashMovement = {
  idmovimentacao_caixa: number;
  tipo: number;
  descricao: string;
  valor: number;
  criado_em: string;
  usuario: string;
};

export type CurrentCash = {
  idcaixa: number;
  idfilial: number;
  aberto_em: string;
  operador: string;
  saldo_inicial: number;
  entradas: number;
  saidas: number;
  saldo_atual: number;
  movements: CashMovement[];
};

export type CashHistoryRow = {
  idcaixa: number;
  idfilial: number;
  filial: string;
  aberto_em: string;
  fechado_em?: string | null;
  saldo_inicial: number;
  saldo_final?: number | null;
  operador: string;
  entradas: number;
  saidas: number;
};

export type DayReportRow = {
  forma: string;
  vendas: number;
  total: number;
};

export type CashierData = {
  branch: number;
  current: CurrentCash | null;
  history: CashHistoryRow[];
  metrics: { open_company: number };
  day_report: DayReportRow[];
  options: { branches: Array<{ id: number; nome: string }> };
};

export const CASH_MOVEMENT_TYPES: Record<
  number,
  { label: string; in: boolean }
> = {
  1: { label: 'Suprimento', in: true },
  2: { label: 'Sangria', in: false },
  3: { label: 'Venda', in: true },
  4: { label: 'Outros', in: false },
};
