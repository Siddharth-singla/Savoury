import api from './client';

export interface Hostel {
  id: string;
  name: string;
}

export interface HostelFeePlan {
  id: string;
  hostelId: string;
  semesterLabel: string;
  totalFee: number;
  hostel?: { name: string };
}

export const listHostels = async (): Promise<{ hostels: Hostel[] }> => {
  const res = await api.get('/hostels');
  return res.data;
};

export const createHostel = async (payload: { name: string }): Promise<{ success: boolean; hostel: Hostel }> => {
  const res = await api.post('/hostels', payload);
  return res.data;
};

export const updateHostel = async (id: string, payload: { name: string }): Promise<{ success: boolean; hostel: Hostel }> => {
  const res = await api.put(`/hostels/${id}`, payload);
  return res.data;
};

export const deleteHostel = async (id: string): Promise<{ success: boolean }> => {
  const res = await api.delete(`/hostels/${id}`);
  return res.data;
};

export const listFeePlans = async (): Promise<{ feePlans: HostelFeePlan[] }> => {
  const res = await api.get('/hostels/fee-plans');
  return res.data;
};

export const setFeePlan = async (hostelId: string, payload: { semesterLabel: string; totalFee: number }) => {
  const res = await api.post(`/hostels/${hostelId}/fee-plans`, payload);
  return res.data;
};
