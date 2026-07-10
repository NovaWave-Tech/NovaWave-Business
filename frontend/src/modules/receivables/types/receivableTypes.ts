export type ReceivableCustomerOption = {
  idcliente: number;
  nome: string;
  documento?: string | null;
  telefone?: string | null;
  titulos_abertos: number;
  total_aberto: number;
};

export type ReceivableItem = {
  produto: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
};

export type ReceivableTitle = {
  idconta_receber: number;
  idvenda: number | null;
  contrato: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_recebimento: string | null;
  situacao: number;
  forma_pagamento: string | null;
  parcela_numero: number;
  parcelas_total: number;
  filial: string | null;
  idfilial: number | null;
  juros_atraso: number;
  dias_atraso: number;
  juros_projetado: number;
  valor_com_juros: number;
  valor_pago: number;
  items: ReceivableItem[];
};

export type ReceivablesData = {
  customer: {
    idcliente: number;
    nome: string;
    documento?: string | null;
    telefone?: string | null;
    email?: string | null;
    permite_venda_prazo: boolean;
  };
  titulos: ReceivableTitle[];
  titulos_pagos: ReceivableTitle[];
  summary: {
    total_aberto: number;
    total_vencido: number;
    total_pago: number;
    abertos: number;
    pagos: number;
  };
};

export type SettlePayload = {
  forma_pagamento: string;
  juros?: number;
  multa?: number;
  desconto?: number;
};
