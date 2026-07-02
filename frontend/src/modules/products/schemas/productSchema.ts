import { z } from 'zod';

const optionalNumber = z.preprocess(
  value => (value === '' || value === undefined ? undefined : Number(value)),
  z.number().min(0, 'O valor nao pode ser negativo.').optional()
);

export const productSchema = z.object({
  nome: z.string().min(2, 'Informe o nome.'),
  descricao: z.string().optional(),
  sku: z.string().optional(),
  codigo_barras: z.string().optional(),
  idcategoria: z.coerce.number().positive('Selecione a categoria.'),
  idmarca: optionalNumber,
  unidade: z.string().min(1),
  imagens_texto: z.string().optional(),
  idfornecedor_principal: optionalNumber,
  idfornecedor_secundario: optionalNumber,
  codigo_fornecedor: z.string().optional(),
  preco_custo: z.coerce.number().min(0),
  preco_venda: z.coerce.number().positive('O preco deve ser maior que zero.'),
  preco_promocional: optionalNumber,
  estoque_inicial: z.coerce.number().min(0),
  estoque_minimo: z.coerce.number().min(0),
  estoque_maximo: z.coerce.number().min(0),
  idfilial_inicial: optionalNumber,
  permite_estoque_negativo: z.boolean(),
  peso: optionalNumber,
  altura: optionalNumber,
  largura: optionalNumber,
  comprimento: optionalNumber,
  ncm: z.string().optional(),
  cest: z.string().optional(),
  cfop: z.string().optional(),
  origem: optionalNumber,
  tributacao: z.string().optional(),
  garantia_meses: optionalNumber,
  lancamento: z.boolean(),
  destaque: z.boolean(),
  situacao: z.boolean(),
});

export type ProductForm = z.infer<typeof productSchema>;
