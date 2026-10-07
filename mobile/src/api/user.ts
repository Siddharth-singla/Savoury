import client from './client';

export const getMe = async () => {
  const res = await client.get('/users/me');
  return res.data.user;
};

export const updateMe = async (data: { name?: string; phone?: string; roomNo?: string; rollNo?: string; avatarBase64?: string | null }) => {
  const res = await client.put('/users/me', data);
  return res.data.user;
};
