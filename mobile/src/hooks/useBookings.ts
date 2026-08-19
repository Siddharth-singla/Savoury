import { useQuery } from '@tanstack/react-query';
import { getBookings } from '../api/bookings';

export const useBookings = (startDate: Date, endDate: Date) => {
  return useQuery({
    queryKey: ['bookings', startDate.toISOString(), endDate.toISOString()],
    queryFn: () => getBookings(startDate, endDate),
    staleTime: 30_000,
  });
};
