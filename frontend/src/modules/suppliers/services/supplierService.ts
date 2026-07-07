import http from '../../../shared/services/http';
import type {
  SupplierDetail,
  SupplierListData,
  SupplierPayload,
} from '../types/supplierTypes';

export const supplierService = {
  list: async (params: Record<string, string>) =>
    (await http.get<{ data: SupplierListData }>('/suppliers', { params })).data
      .data,
  detail: async (id: number) =>
    (await http.get<{ data: SupplierDetail }>(`/suppliers/${id}`)).data.data,
  create: async (payload: SupplierPayload) =>
    (await http.post('/suppliers', payload)).data,
  update: async (id: number, payload: SupplierPayload) =>
    (await http.put(`/suppliers/${id}`, payload)).data,
  setStatus: async (id: number, situacao: number) =>
    (await http.patch(`/suppliers/${id}/status`, { situacao })).data,
};
