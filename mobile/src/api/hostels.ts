import apiClient from './client';
import type { Hostel } from '../types';

export const getHostels = async (): Promise<Hostel[]> => {
  const res = await apiClient.get<{ hostels: Hostel[] }>('/hostels');
  return res.data.hostels;
};
