import { z } from 'zod';

const optionalNumber = z.preprocess(
  value => (value === '' || value === undefined ? undefined : Number(value)),
  z.number().optional()
);

export const branchSchema = z.object({
  nome: z.string().min(3, 'Informe o nome da filial.'),
  codigo: z.string().min(1, 'Informe o codigo interno.'),
  cnpj: z.string().optional(),
  inscricao_estadual: z.string().optional(),
  email: z.union([
    z.literal(''),
    z.string().email('Informe um e-mail valido.'),
  ]),
  telefone: z.string().optional(),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().min(2, 'Informe a cidade.'),
  estado: z.string().length(2, 'Use a sigla do estado.'),
  matriz: z.boolean(),
  idgerente: optionalNumber,
  latitude: optionalNumber,
  longitude: optionalNumber,
  permite_estoque_negativo: z.boolean(),
  caixa_obrigatorio: z.boolean(),
  situacao: z.boolean(),
  meta_mensal: optionalNumber,
});

export type BranchForm = z.infer<typeof branchSchema>;
