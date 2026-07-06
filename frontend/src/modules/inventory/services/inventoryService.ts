import http from '../../../shared/services/http';
import type {
  InventoryData,
  MovementPayload,
  ProductStockDetail,
} from '../types/inventoryTypes';

export const inventoryService = {
  list: async (params: Record<string, string>) =>
    (await http.get<{ data: InventoryData }>('/inventory', { params })).data
      .data,
  productDetail: async (id: number) =>
    (await http.get<{ data: ProductStockDetail }>(`/products/${id}`)).data.data,
  movement: async (productId: number, payload: MovementPayload) =>
    (await http.post(`/products/${productId}/movements`, payload)).data,
};
