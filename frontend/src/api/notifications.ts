import client from './client';

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  related_id?: number;
  is_read: boolean;
  created_at: string;
}

export const getNotifications = async (skip = 0, limit = 50) => {
  const response = await client.get<Notification[]>('/api/v1/notifications/', {
    params: { skip, limit },
  });
  return response.data;
};

export const markNotificationRead = async (id: number) => {
  const response = await client.patch<Notification>(`/api/v1/notifications/${id}/read`, {});
  return response.data;
};

export const deleteNotification = async (id: number) => {
  await client.delete(`/api/v1/notifications/${id}`);
};
