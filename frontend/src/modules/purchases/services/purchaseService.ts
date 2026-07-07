import http from '../../../shared/services/http';
import type {
  PurchaseDetail,
  PurchaseListData,
  PurchasePayload,
} from '../types/purchaseTypes';

export const purchaseService = {
  list: async (params: Record<string, string>) =>
    (await http.get<{ data: PurchaseListData }>('/purchases', { params })).data
      .data,
  detail: async (id: number) =>
    (await http.get<{ data: PurchaseDetail }>(`/purchases/${id}`)).data.data,
  create: async (payload: PurchasePayload) =>
    (await http.post('/purchases', payload)).data,
  setStatus: async (id: number, situacao: number) =>
    (await http.patch(`/purchases/${id}/status`, { situacao })).data,
};
