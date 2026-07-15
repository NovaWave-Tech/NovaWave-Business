import http from '../../../shared/services/http';

export type Option = { id: number; nome: string };
export type Product = {
  idproduto: number;
  nome: string;
  descricao?: string;
  sku?: string;
  codigo_barras?: string;
  categoria?: string;
  marca?: string;
  idcategoria: number;
  idmarca?: number;
  imagem?: string;
  unidade: string;
  preco_custo: number;
  preco_venda: number;
  preco_promocional?: number;
  estoque_minimo: number;
  estoque_maximo: number;
  estoque: number;
  reservado: number;
  filiais_estoque: number;
  margem: number;
  vendido: number;
  receita: number;
  last_sale?: string;
  peso?: number;
  altura?: number;
  largura?: number;
  comprimento?: number;
  ncm?: string;
  cest?: string;
  cfop?: string;
  origem?: number;
  tributacao?: string;
  garantia_meses?: number;
  permite_estoque_negativo: boolean;
  lancamento: boolean;
  destaque: boolean;
  situacao: number;
  criado_em: string;
  atualizado_em?: string;
  ultimo_reajuste?: string;
};

export type ProductList = {
  products: Product[];
  metrics: {
    total: number;
    active: number;
    inactive: number;
    critical: number;
    branches: number;
    stock_value: number;
    best_seller: string;
  };
  options: {
    categories: Option[];
    brands: Option[];
    suppliers: Option[];
    branches: Option[];
  };
};

export type ProductDetail = Product & {
  images: Array<{ idproduto_imagem: number; url: string; principal: boolean }>;
  suppliers: Array<{
    idfornecedor: number;
    principal: boolean;
    codigo_fornecedor?: string;
    ultimo_preco?: number;
    razao_social: string;
    nome_fantasia?: string;
  }>;
  stock: Array<{
    idfilial: number;
    filial: string;
    quantidade: number;
    quantidade_reservada: number;
    disponivel: number;
    ultima_movimentacao?: string;
  }>;
  movements: Array<{
    idmovimentacao_estoque: number;
    tipo: number;
    quantidade: number;
    filial: string;
    usuario?: string;
    observacao?: string;
    criado_em: string;
  }>;
  sales: {
    quantity: number;
    revenue: number;
    average_ticket: number;
    last_sale?: string;
  };
  top_branches: Array<{ filial: string; quantity: number; revenue: number }>;
  last_purchase?: {
    data_compra: string;
    valor_unitario: number;
    fornecedor?: string;
  };
  history: Array<{ idauditoria: number; acao: string; criado_em: string }>;
};

export type ProductPayload = Omit<
  import('../schemas/productSchema').ProductForm,
  'imagens_texto'
> & { imagens: string[] };

/**
 * Contrato minimo aceito por POST /products: o backend exige nome,
 * categoria e preco de venda; os demais campos tem default. Usado pelo
 * cadastro rapido (ex.: produto novo direto na compra).
 */
export type QuickProductPayload = {
  nome: string;
  idcategoria: number;
  unidade: string;
  preco_custo: number;
  preco_venda: number;
};

export const productService = {
  list: async (params: Record<string, string>) =>
    (await http.get<{ data: ProductList }>('/products', { params })).data.data,
  detail: async (id: number) =>
    (await http.get<{ data: ProductDetail }>(`/products/${id}`)).data.data,
  create: async (payload: ProductPayload) =>
    (await http.post('/products', payload)).data,
  quickCreate: async (payload: QuickProductPayload) =>
    (await http.post<{ data: { idproduto: number } }>('/products', payload))
      .data,
  update: async (id: number, payload: ProductPayload) =>
    (await http.put(`/products/${id}`, payload)).data,
  status: async (id: number, situacao: number) =>
    (await http.patch(`/products/${id}/status`, { situacao })).data,
  duplicate: async (id: number) =>
    (await http.post(`/products/${id}/duplicate`)).data,
  movement: async (
    id: number,
    payload: {
      idfilial: number;
      tipo: number;
      quantidade: number;
      observacao?: string;
    }
  ) => (await http.post(`/products/${id}/movements`, payload)).data,
};
