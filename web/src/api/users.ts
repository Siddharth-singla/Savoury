import client from './client';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  hostelId: string | null;
  rollNo: string | null;
  phone: string | null;
  createdAt: string;
  hostel?: { name: string } | null;
}

export interface UsersResponse {
  users: UserRow[];
  total: number;
  page: number;
  limit: number;
}

export const listUsers = async (params: { role?: string; hostelId?: string; page?: number; limit?: number }): Promise<UsersResponse> => {
  const res = await client.get<UsersResponse>('/users', { params });
  return res.data;
};

export const updateRole = async (id: string, role: string): Promise<UserRow> => {
  const res = await client.patch<{ user: UserRow }>(`/users/${id}/role`, { role });
  return res.data.user;
};

export const deleteUser = async (id: string): Promise<void> => {
  await client.delete(`/users/${id}`);
};
