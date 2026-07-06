import http from '../../../shared/services/http';
import type { SaleDetail, SaleListData, SalePayload } from '../types/saleTypes';

export const saleService = {
  list: async (params: Record<string, string>) =>
    (await http.get<{ data: SaleListData }>('/sales', { params })).data.data,
  detail: async (id: number) =>
    (await http.get<{ data: SaleDetail }>(`/sales/${id}`)).data.data,
  create: async (payload: SalePayload) =>
    (await http.post('/sales', payload)).data,
  setStatus: async (id: number, situacao: number) =>
    (await http.patch(`/sales/${id}/status`, { situacao })).data,
};
