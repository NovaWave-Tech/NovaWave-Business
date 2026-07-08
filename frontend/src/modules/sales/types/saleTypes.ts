export type SaleRow = {
  idvenda: number;
  data_venda: string;
  cliente: string;
  idcliente: number | null;
  filial: string;
  usuario: string;
  itens: number;
  quantidade: number;
  valor_bruto: number;
  valor_desconto: number;
  valor_total: number;
  situacao: number;
};

export type SaleMetrics = {
  sales: number;
  cancelled: number;
  revenue: number;
  average_ticket: number;
  discount: number;
  items_sold: number;
};

export type BranchOption = { id: number; nome: string };
export type CustomerOption = { id: number; nome: string; documento?: string };
export type ProductOption = {
  id: number;
  nome: string;
  sku?: string | null;
  codigo_barras?: string | null;
  unidade: string;
  preco_venda: number;
  estoque: number;
};

export type SaleListData = {
  sales: SaleRow[];
  metrics: SaleMetrics;
  options: {
    branches: BranchOption[];
    customers: CustomerOption[];
    products: ProductOption[];
  };
};

export type SaleItem = {
  idvenda_item: number;
  idproduto: number;
  produto: string;
  unidade: string;
  sku?: string | null;
  quantidade: number;
  valor_unitario: number;
  valor_desconto: number;
  valor_total: number;
};

export type SaleDetail = SaleRow & {
  idfilial: number;
  cliente_documento?: string | null;
  criado_em: string;
  items: SaleItem[];
  history: Array<{
    idauditoria: number;
    acao: string;
    criado_em: string;
    usuario: string;
  }>;
};

export type SalePayload = {
  idfilial: number;
  idcliente?: number | null;
  valor_desconto?: number;
  items: Array<{
    idproduto: number;
    quantidade: number;
    valor_unitario?: number;
    valor_desconto?: number;
  }>;
};

export type ReceiptParty = {
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
};

export type SaleReceiptData = {
  sale: SaleDetail;
  company: ReceiptParty;
  branch:
    | (ReceiptParty & {
        idfilial: number;
        nome: string;
        codigo?: string | null;
        matriz: boolean;
      })
    | null;
  customer: {
    nome: string;
    documento?: string | null;
    email?: string | null;
    telefone?: string | null;
  } | null;
  issued_at: string;
};

export const SALE_STATUS: Record<number, { label: string; scheme: string }> = {
  1: { label: 'Concluida', scheme: 'green' },
  2: { label: 'Pendente', scheme: 'yellow' },
  3: { label: 'Devolvida', scheme: 'orange' },
  4: { label: 'Cancelada', scheme: 'red' },
};
