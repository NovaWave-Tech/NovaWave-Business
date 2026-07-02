import { z } from 'zod';

export const userSchema = z
  .object({
    nome: z.string().min(3, 'Informe o nome completo.'),
    cpf: z.string().optional(),
    telefone: z.string().optional(),
    birth_date: z.string().optional(),
    email: z.string().email('Informe um e-mail valido.'),
    idfilial: z.coerce.number().positive('Selecione a filial.'),
    iddepartamento: z.coerce.number().optional(),
    idcargo: z.coerce.number().optional(),
    idperfil: z.coerce.number().optional(),
    senha: z.string().min(10, 'Use ao menos 10 caracteres.'),
    confirmar_senha: z.string(),
    admin_empresa: z.boolean(),
    force_password_change: z.boolean(),
    two_factor_enabled: z.boolean(),
  })
  .refine(data => data.senha === data.confirmar_senha, {
    message: 'As senhas nao coincidem.',
    path: ['confirmar_senha'],
  });

export type UserFormData = z.infer<typeof userSchema>;

export const editUserSchema = z.object({
  nome: z.string().min(3, 'Informe o nome completo.'),
  cpf: z.string().optional(),
  telefone: z.string().optional(),
  birth_date: z.string().optional(),
  email: z.string().email('Informe um e-mail valido.'),
  idfilial: z.coerce.number().positive('Selecione a filial.'),
  iddepartamento: z.coerce.number().optional(),
  idcargo: z.coerce.number().optional(),
  idperfil: z.coerce.number().optional(),
  admin_empresa: z.boolean(),
  force_password_change: z.boolean(),
  two_factor_enabled: z.boolean(),
});

export type EditUserFormData = z.infer<typeof editUserSchema>;
