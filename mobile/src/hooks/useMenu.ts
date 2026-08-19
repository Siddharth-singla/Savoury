import { useQuery } from '@tanstack/react-query';
import { getMenu } from '../api/menu';

export const useMenu = (startDate: Date, endDate: Date) => {
  return useQuery({
    queryKey: ['menu', startDate.toISOString(), endDate.toISOString()],
    queryFn: () => getMenu(startDate, endDate),
    staleTime: 60_000,
  });
};
