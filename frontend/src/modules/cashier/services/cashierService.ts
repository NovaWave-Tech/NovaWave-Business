import http from '../../../shared/services/http';
import type { CashierData } from '../types/cashierTypes';

export const cashierService = {
  overview: async (branch: string) =>
    (
      await http.get<{ data: CashierData }>('/cashier', {
        params: branch ? { branch } : {},
      })
    ).data.data,
  open: async (payload: { idfilial: number; saldo_inicial: number }) =>
    (await http.post('/cashier/open', payload)).data,
  movement: async (
    cashId: number,
    payload: { tipo: number; descricao: string; valor: number }
  ) => (await http.post(`/cashier/${cashId}/movements`, payload)).data,
  close: async (cashId: number, payload: { saldo_final?: number }) =>
    (
      await http.post<{
        data: {
          saldo_esperado: number;
          saldo_final: number;
          diferenca: number;
        };
      }>(`/cashier/${cashId}/close`, payload)
    ).data.data,
};
