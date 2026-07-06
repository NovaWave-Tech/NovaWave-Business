import http from '../../../shared/services/http';
import type {
  ProfileDetail,
  ProfileListData,
  ProfilePayload,
} from '../types/permissionTypes';

export const permissionService = {
  list: async (params: Record<string, string>) =>
    (await http.get<{ data: ProfileListData }>('/permissions', { params })).data
      .data,
  detail: async (id: number) =>
    (await http.get<{ data: ProfileDetail }>(`/permissions/${id}`)).data.data,
  create: async (payload: ProfilePayload) =>
    (await http.post('/permissions', payload)).data,
  update: async (id: number, payload: ProfilePayload) =>
    (await http.put(`/permissions/${id}`, payload)).data,
  duplicate: async (id: number) =>
    (await http.post(`/permissions/${id}/duplicate`)).data,
  setStatus: async (id: number, situacao: number) =>
    (await http.patch(`/permissions/${id}/status`, { situacao })).data,
};
