import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { fetchNotices, fetchLatestTimestamp } from '../api/notices';

/**
 * Fetches notices with cursor-based infinite scrolling.
 * Automatically refetches every 30 seconds so new notices appear in near-real-time.
 */
export const useNotices = () => {
  return useInfiniteQuery({
    queryKey: ['notices'],
    queryFn: ({ pageParam }) => fetchNotices(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: 30_000, // poll every 30s for real-time feel
    staleTime: 15_000,
  });
};

/**
 * Ultra-lightweight poll: just checks the latest notice timestamp.
 * Mobile can use this to show a "new notices" badge without fetching all data.
 */
export const useLatestNoticeTimestamp = () => {
  return useQuery({
    queryKey: ['notices', 'latest-timestamp'],
    queryFn: fetchLatestTimestamp,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
};
