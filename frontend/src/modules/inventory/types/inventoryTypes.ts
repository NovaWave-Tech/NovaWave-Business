export type InventoryStatus = 'ok' | 'critico' | 'ruptura';

export type InventoryItem = {
  idestoque: number;
  idproduto: number;
  idfilial: number;
  produto: string;
  sku?: string | null;
  codigo_barras?: string | null;
  unidade: string;
  filial: string;
  quantidade: number;
  reservado: number;
  disponivel: number;
  minimo: number;
  maximo: number;
  preco_custo: number;
  preco_venda: number;
  valor: number;
  status: InventoryStatus;
  ultima_movimentacao?: string | null;
};

export type InventoryMetrics = {
  skus: number;
  items: number;
  value: number;
  critical: number;
  ruptures: number;
  branches: number;
};

export type BranchOption = { id: number; nome: string };
export type CategoryOption = { id: number; nome: string };
export type ProductOption = {
  id: number;
  nome: string;
  sku?: string | null;
  unidade: string;
};

export type InventoryData = {
  items: InventoryItem[];
  metrics: InventoryMetrics;
  options: {
    branches: BranchOption[];
    categories: CategoryOption[];
    products: ProductOption[];
  };
};

export type ProductStockRow = {
  idfilial: number;
  filial: string;
  quantidade: number;
  quantidade_reservada: number;
  disponivel: number;
  ultima_movimentacao?: string | null;
};

export type ProductMovementRow = {
  idmovimentacao_estoque: number;
  tipo: number;
  quantidade: number;
  documento_referencia?: string | null;
  observacao?: string | null;
  criado_em: string;
  filial: string;
  usuario?: string | null;
};

export type ProductStockDetail = {
  idproduto: number;
  nome: string;
  sku?: string | null;
  unidade: string;
  estoque_minimo: number;
  stock: ProductStockRow[];
  movements: ProductMovementRow[];
};

export type MovementPayload = {
  idfilial: number;
  tipo: number;
  quantidade: number;
  observacao?: string;
};

export const MOVEMENT_TYPES: Record<number, string> = {
  1: 'Entrada',
  2: 'Saida',
  3: 'Ajuste',
};

export const INVENTORY_STATUS: Record<
  InventoryStatus,
  { label: string; scheme: string }
> = {
  ok: { label: 'Disponivel', scheme: 'green' },
  critico: { label: 'Critico', scheme: 'orange' },
  ruptura: { label: 'Ruptura', scheme: 'red' },
};
