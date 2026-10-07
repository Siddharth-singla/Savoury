import apiClient from './client';

export interface NoticeAuthor {
  id: string;
  name: string;
  role: string;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  targetRole: string | null;
  createdAt: string;
  postedBy: NoticeAuthor;
}

export interface NoticesListResponse {
  notices: Notice[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function fetchNotices(cursor?: string, limit = 30): Promise<NoticesListResponse> {
  const params: Record<string, string> = { limit: String(limit) };
  if (cursor) params.cursor = cursor;
  const { data } = await apiClient.get<NoticesListResponse>('/notices', { params });
  return data;
}

export async function createNotice(payload: { title: string; body: string; targetRole?: string | null }): Promise<Notice> {
  const { data } = await apiClient.post<Notice>('/notices', payload);
  return data;
}

export async function deleteNotice(id: string): Promise<void> {
  await apiClient.delete(`/notices/${id}`);
}
