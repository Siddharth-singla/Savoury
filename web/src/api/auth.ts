import client from './client';

export const login = async (email: string, password: string) => {
  const res = await client.post<{ accessToken: string; user: any }>('/auth/login', { email, password });
  return res.data;
};

export const checkSetupStatus = async (): Promise<{ setupRequired: boolean }> => {
  const res = await client.get<{ setupRequired: boolean }>('/auth/setup-status');
  return res.data;
};

export const setupSuperAdmin = async (name: string, email: string, password: string) => {
  const res = await client.post<{ accessToken: string; user: any }>('/auth/setup', { name, email, password });
  return res.data;
};
