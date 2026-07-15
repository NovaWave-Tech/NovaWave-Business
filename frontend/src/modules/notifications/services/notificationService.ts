import http from '../../../shared/services/http';
import type { NotificationsData } from '../types/notificationTypes';

export const notificationService = {
  list: async () =>
    (await http.get<{ data: NotificationsData }>('/notifications')).data.data,
  markRead: async (id: number) =>
    (await http.post(`/notifications/${id}/read`)).data,
  markAllRead: async () => (await http.post('/notifications/read-all')).data,
};
