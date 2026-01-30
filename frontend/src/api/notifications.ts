import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  related_id?: number;
  is_read: boolean;
  created_at: string;
}

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

export const getNotifications = async (skip = 0, limit = 50) => {
  const response = await axios.get<Notification[]>(`${API_URL}/api/v1/notifications/`, {
    params: { skip, limit },
    headers: getAuthHeader(),
  });
  return response.data;
};

export const markNotificationRead = async (id: number) => {
  const response = await axios.patch<Notification>(`${API_URL}/api/v1/notifications/${id}/read`, {}, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const deleteNotification = async (id: number) => {
  await axios.delete(`${API_URL}/api/v1/notifications/${id}`, {
    headers: getAuthHeader(),
  });
};
