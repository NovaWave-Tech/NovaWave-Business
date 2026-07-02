import { z } from 'zod';

export const reportFilterSchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
  branch: z.string(),
});

export type ReportFilters = z.infer<typeof reportFilterSchema>;
