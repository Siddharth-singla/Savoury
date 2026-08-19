import apiClient from './client';
import type { LoginResponse, RegisterResponse } from '../types';

export const postLogin = async (email: string, password: string): Promise<LoginResponse> => {
  const res = await apiClient.post<LoginResponse>('/auth/login', { email, password });
  return res.data;
};

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  hostelId: string;
  rollNo?: string;
  phone?: string;
}

export const postRegister = async (data: RegisterData): Promise<RegisterResponse> => {
  const res = await apiClient.post<RegisterResponse>('/auth/register', data);
  return res.data;
};
