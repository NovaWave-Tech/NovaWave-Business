import http from '../../../shared/services/http';
import type {
  ReceivableCustomerOption,
  ReceivablesData,
  SettlePayload,
} from '../types/receivableTypes';

export const receivableService = {
  searchCustomers: async (q: string) =>
    (
      await http.get<{ data: ReceivableCustomerOption[] }>(
        '/receivables/customers',
        { params: { q } }
      )
    ).data.data,
  load: async (idcliente: number) =>
    (
      await http.get<{ data: ReceivablesData }>('/receivables', {
        params: { idcliente },
      })
    ).data.data,
  settle: async (id: number, payload: SettlePayload) =>
    (await http.post(`/receivables/${id}/settle`, payload)).data,
};
