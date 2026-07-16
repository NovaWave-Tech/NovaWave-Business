import http from '../../../shared/services/http';

export type GoalScope = 'company' | 'branch' | 'seller';

export type GoalEntry = {
  nome: string;
  meta: number;
  realizado: number;
};
export type BranchGoal = GoalEntry & { idfilial: number };
export type SellerGoal = GoalEntry & { idusuario: number };

export type GoalsData = {
  competencia: string;
  company: { meta: number; realizado: number };
  branches: BranchGoal[];
  sellers: SellerGoal[];
};

export type SaveGoalPayload = {
  escopo: GoalScope;
  id?: number;
  competencia: string;
  valor_meta: number;
};

export const goalService = {
  list: async (competencia: string) =>
    (
      await http.get<{ data: GoalsData }>('/goals', {
        params: { competencia },
      })
    ).data.data,
  save: async (payload: SaveGoalPayload) =>
    (await http.put('/goals', payload)).data,
};
