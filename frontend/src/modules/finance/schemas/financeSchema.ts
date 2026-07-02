import { z } from 'zod';

const optionalNumber = z.preprocess(
  value => (value === '' || value === undefined ? undefined : Number(value)),
  z.number().min(0).optional()
);

export const financeSchema = z.object({
  descricao: z.string().min(3, 'Informe a descricao.'),
  idcategoria_financeira: z.coerce.number().positive('Selecione a categoria.'),
  idcentro_custo: z.coerce.number().positive('Selecione o centro de custo.'),
  idconta_bancaria: z.coerce.number().positive('Selecione a conta.'),
  idfilial: optionalNumber,
  idcliente: optionalNumber,
  idfornecedor: optionalNumber,
  valor: z.coerce.number().positive('O valor deve ser maior que zero.'),
  data_vencimento: z.string().min(1, 'Informe a data.'),
  forma_pagamento: z.string().optional(),
  documento: z.string().optional(),
  observacoes: z.string().max(1000).optional(),
  juros: optionalNumber,
  desconto: optionalNumber,
  multa: optionalNumber,
  parcelas_total: z.coerce.number().int().min(1).max(120),
  recorrente: z.boolean(),
});

export type FinanceForm = z.infer<typeof financeSchema>;
