export type PurchaseRow = {
  idcompra: number;
  data_compra: string;
  fornecedor: string;
  idfornecedor: number | null;
  filial: string;
  usuario: string;
  itens: number;
  quantidade: number;
  valor_total: number;
  situacao: number;
  forma_pagamento: string | null;
  a_prazo: boolean;
  parcelas: number;
};

export type PurchaseMetrics = {
  purchases: number;
  cancelled: number;
  total: number;
  average_ticket: number;
  suppliers: number;
  items_bought: number;
};

export type BranchOption = { id: number; nome: string };
export type SupplierOption = { id: number; nome: string };
export type ProductOption = {
  id: number;
  nome: string;
  sku?: string | null;
  codigo_barras?: string | null;
  unidade: string;
  preco_custo: number;
  estoque: number;
};

export type PurchaseListData = {
  purchases: PurchaseRow[];
  metrics: PurchaseMetrics;
  options: {
    branches: BranchOption[];
    suppliers: SupplierOption[];
    products: ProductOption[];
  };
};

export type PurchaseItem = {
  idcompra_item: number;
  idproduto: number;
  produto: string;
  unidade: string;
  sku?: string | null;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
};

export type PurchaseDetail = PurchaseRow & {
  idfilial: number;
  criado_em: string;
  items: PurchaseItem[];
  history: Array<{
    idauditoria: number;
    acao: string;
    criado_em: string;
    usuario: string;
  }>;
};

export type PurchasePayment =
  | 'dinheiro'
  | 'pix'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'boleto'
  | 'transferencia';

export const PURCHASE_PAYMENT_METHODS: Array<{
  value: PurchasePayment;
  label: string;
}> = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cartao_credito', label: 'Credito' },
  { value: 'cartao_debito', label: 'Debito' },
];

export type PurchasePayload = {
  idfilial: number;
  idfornecedor?: number | null;
  forma_pagamento: PurchasePayment;
  a_prazo: boolean;
  parcelas: number;
  items: Array<{
    idproduto: number;
    quantidade: number;
    valor_unitario?: number;
  }>;
};

export const PURCHASE_STATUS: Record<
  number,
  { label: string; scheme: string }
> = {
  1: { label: 'Concluida', scheme: 'green' },
  2: { label: 'Pendente', scheme: 'yellow' },
  3: { label: 'Devolvida', scheme: 'orange' },
  4: { label: 'Cancelada', scheme: 'red' },
};
