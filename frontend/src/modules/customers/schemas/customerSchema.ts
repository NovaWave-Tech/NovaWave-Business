import { z } from 'zod';
import {
  digitsOnly,
  isValidCnpj,
  isValidCpf,
} from '../../../shared/utils/formatters';

const optionalNumber = z.preprocess(
  value => (value === '' || value === undefined ? 0 : Number(value)),
  z.number().min(0, 'O limite nao pode ser negativo.')
);

export const customerSchema = z
  .object({
    tipo_pessoa: z.coerce.number().refine(value => [1, 2].includes(value)),
    nome: z.string().min(3, 'Informe o nome ou razao social.'),
    nome_fantasia: z.string().optional(),
    rg: z.string().optional(),
    inscricao_estadual: z.string().optional(),
    data_nascimento_abertura: z.string().optional(),
    documento: z.string().min(1, 'Informe o documento.'),
    email: z.union([
      z.literal(''),
      z.string().email('Informe um e-mail valido.'),
    ]),
    telefone: z
      .string()
      .refine(
        value => !value || [10, 11].includes(digitsOnly(value).length),
        'Informe um telefone valido.'
      ),
    cep: z
      .string()
      .refine(
        value => !value || digitsOnly(value).length === 8,
        'Informe um CEP valido.'
      ),
    endereco: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    estado: z
      .string()
      .refine(value => !value || value.length === 2, 'Use a sigla do estado.'),
    limite_credito: optionalNumber,
    situacao: z.boolean(),
    recorrente: z.boolean(),
    permite_venda_prazo: z.boolean(),
    observacao: z.string().max(1000).optional(),
  })
  .superRefine((data, context) => {
    const valid =
      data.tipo_pessoa === 1
        ? isValidCpf(data.documento)
        : isValidCnpj(data.documento);
    if (!valid) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['documento'],
        message: data.tipo_pessoa === 1 ? 'CPF invalido.' : 'CNPJ invalido.',
      });
    }
  });

export type CustomerForm = z.infer<typeof customerSchema>;
