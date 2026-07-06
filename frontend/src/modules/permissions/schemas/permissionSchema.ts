import { z } from 'zod';

export const profileSchema = z.object({
  nome: z.string().min(3, 'Informe o nome do perfil.'),
  descricao: z.string().optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
