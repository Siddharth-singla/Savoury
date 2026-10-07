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

export interface NoticesResponse {
  notices: Notice[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface LatestTimestampResponse {
  latestTimestamp: string | null;
}

export async function fetchNotices(cursor?: string, limit = 20): Promise<NoticesResponse> {
  const params: Record<string, string> = { limit: String(limit) };
  if (cursor) params.cursor = cursor;
  const { data } = await apiClient.get<NoticesResponse>('/notices', { params });
  return data;
}

export async function fetchLatestTimestamp(): Promise<string | null> {
  const { data } = await apiClient.get<LatestTimestampResponse>('/notices/latest-timestamp');
  return data.latestTimestamp;
}
