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
  juros: number;
  multa: number;
  desconto: number;
  valor_com_juros: number;
  valor_pago: number;
  items: ReceivableItem[];
};

export type ReceivableOrder = {
  idvenda: number;
  contrato: string;
  data_venda: string | null;
  filial: string | null;
  idfilial: number | null;
  valor_total: number;
  forma_pagamento: string | null;
  a_prazo: boolean;
  titulos_total: number;
  titulos_pagos: number;
  titulos_abertos: number;
  parcelas_total: number;
  valor_pago: number;
  valor_aberto: number;
  proximo_vencimento: string | null;
  baixado: boolean;
  items: ReceivableItem[];
};

export type ReceivableTransaction = {
  idconta_receber: number;
  idvenda: number | null;
  grupo: string;
  status: string;
  data_hora: string;
  valor: number;
  origem: string;
  meio: string | null;
  filial: string | null;
  valor_base: number;
  juros: number;
  multa: number;
  desconto: number;
  data_vencimento: string;
  data_recebimento: string | null;
  parcela_numero: number;
  parcelas_total: number;
  items: ReceivableItem[];
};

export type ReceivableCustomer = {
  idcliente: number;
  nome: string;
  documento?: string | null;
  telefone?: string | null;
  email?: string | null;
  permite_venda_prazo: boolean;
};

export type ReceivablesData = {
  company: {
    razao_social?: string | null;
    nome_fantasia?: string | null;
    cnpj?: string | null;
  };
  customer: ReceivableCustomer;
  titulos: ReceivableTitle[];
  titulos_pagos: ReceivableTitle[];
  pedidos: ReceivableOrder[];
  pedidos_baixados: ReceivableOrder[];
  transacoes: ReceivableTransaction[];
  summary: {
    total_aberto: number;
    total_vencido: number;
    total_pago: number;
    abertos: number;
    pagos: number;
    pedidos_abertos: number;
    pedidos_baixados: number;
    transacoes: number;
  };
};

export type SettlePayload = {
  forma_pagamento: string;
  juros?: number;
  multa?: number;
  desconto?: number;
};
