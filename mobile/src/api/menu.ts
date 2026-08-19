import apiClient from './client';
import type { MenuResponse } from '../types';

export const getMenu = async (startDate: Date, endDate: Date): Promise<MenuResponse> => {
  const res = await apiClient.get<MenuResponse>('/menu', {
    params: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
  });
  return res.data;
};
