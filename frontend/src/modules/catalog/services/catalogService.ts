import http from '../../../shared/services/http';
import type { CatalogData } from '../types/catalogTypes';

export const catalogService = {
  list: async () =>
    (await http.get<{ data: CatalogData }>('/catalog')).data.data,
  createCategory: async (payload: { nome: string; descricao?: string }) =>
    (await http.post('/catalog/categories', payload)).data,
  updateCategory: async (
    id: number,
    payload: { nome: string; descricao?: string }
  ) => (await http.put(`/catalog/categories/${id}`, payload)).data,
  setCategoryStatus: async (id: number, situacao: number) =>
    (await http.patch(`/catalog/categories/${id}/status`, { situacao })).data,
  createBrand: async (payload: { nome: string }) =>
    (await http.post('/catalog/brands', payload)).data,
  updateBrand: async (id: number, payload: { nome: string }) =>
    (await http.put(`/catalog/brands/${id}`, payload)).data,
  setBrandStatus: async (id: number, situacao: number) =>
    (await http.patch(`/catalog/brands/${id}/status`, { situacao })).data,
};
