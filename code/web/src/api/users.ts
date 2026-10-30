import client from './client';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  hostelId: string | null;
  rollNo: string | null;
  phone: string | null;
  roomNo?: string | null;
  createdAt: string;
  hostel?: { name: string } | null;
}

export interface UsersResponse {
  users: UserRow[];
  total: number;
  page: number;
  limit: number;
}

export const listUsers = async (params: { role?: string; hostelId?: string; page?: number; limit?: number; search?: string }): Promise<UsersResponse> => {
  const res = await client.get<UsersResponse>('/users', { params });
  return res.data;
};

export const updateRole = async (id: string, role: string): Promise<UserRow> => {
  const res = await client.patch<{ user: UserRow }>(`/users/${id}/role`, { role });
  return res.data.user;
};

export const updateUser = async (id: string, payload: {
  name?: string;
  email?: string;
  rollNo?: string | null;
  phone?: string | null;
  roomNo?: string | null;
  role?: string;
  password?: string;
}): Promise<UserRow> => {
  const res = await client.put<{ user: UserRow }>(`/users/${id}`, payload);
  return res.data.user;
};

export const createUser = async (payload: {
  name: string;
  email: string;
  password: string;
  role: string;
  rollNo?: string | null;
  phone?: string | null;
  roomNo?: string | null;
  hostelId?: string | null;
}): Promise<UserRow> => {
  const res = await client.post<{ user: UserRow }>('/users', payload);
  return res.data.user;
};

export const deleteUser = async (id: string): Promise<void> => {
  await client.delete(`/users/${id}`);
};
