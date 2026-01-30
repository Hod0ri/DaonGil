import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface Memory {
  id: number;
  place_id: number;
  user_id: number;
  visit_date: string;
  description?: string;
  images?: string[];
  created_at?: string;
}

export interface MemoryCreate {
  visit_date: string;
  description?: string;
  images?: File[];
}

export interface Place {
  id: number;
  user_id: number;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  tags?: string[];
  color: string;
  memories: Memory[];
}

export interface PlaceCreate {
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  tags?: string[];
  color?: string;
}

export interface PlaceUpdate {
  name?: string;
  address?: string;
  tags?: string[];
  color?: string;
}

export const getPlaces = async (token: string): Promise<Place[]> => {
  const response = await axios.get(`${API_URL}/api/v1/places/`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const createPlace = async (token: string, place: PlaceCreate): Promise<Place> => {
  const response = await axios.post(`${API_URL}/api/v1/places/`, place, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const createMemory = async (token: string, placeId: number, memory: MemoryCreate): Promise<Memory> => {
  const formData = new FormData();
  formData.append('visit_date', memory.visit_date);
  if (memory.description) {
    formData.append('description', memory.description);
  }
  if (memory.images) {
    memory.images.forEach((file) => {
      formData.append('images', file);
    });
  }

  const response = await axios.post(`${API_URL}/api/v1/places/${placeId}/memories`, formData, {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const updatePlace = async (token: string, id: number, place: PlaceUpdate): Promise<Place> => {
  const response = await axios.put(`${API_URL}/api/v1/places/${id}`, place, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const deletePlace = async (token: string, id: number): Promise<void> => {
  await axios.delete(`${API_URL}/api/v1/places/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};
