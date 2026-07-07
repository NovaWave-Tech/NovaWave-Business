export type Supplier = {
  idfornecedor: number;
  razao_social: string;
  nome_fantasia?: string | null;
  documento?: string | null;
  email?: string | null;
  telefone?: string | null;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  situacao: number;
  criado_em: string;
  atualizado_em?: string | null;
  compras: number;
  total_comprado: number;
  ultima_compra?: string | null;
};

export type SupplierListData = {
  suppliers: Supplier[];
  metrics: {
    total: number;
    active: number;
    inactive: number;
    with_purchases: number;
    volume: number;
  };
};

export type SupplierDetail = Supplier & {
  purchases: Array<{
    idcompra: number;
    data_compra: string;
    valor_total: number;
    situacao: number;
    filial: string;
  }>;
};

export type SupplierPayload = {
  razao_social: string;
  nome_fantasia?: string;
  documento?: string;
  email?: string;
  telefone?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  situacao?: boolean;
};
