import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleBooking } from '../api/bookings';
import type { Booking } from '../types';

interface ToggleVars {
  mealTypeId: string;
  date: Date;
  status: 'OPTED_IN' | 'OPTED_OUT';
  queryKey: string[];
}

export const useToggleBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mealTypeId, date, status }: ToggleVars) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const noonUtcString = `${year}-${month}-${day}T12:00:00Z`;
      return toggleBooking(mealTypeId, noonUtcString, status);
    },

    onMutate: async ({ mealTypeId, date, status, queryKey }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Booking[]>(queryKey);
      const dateStr = date.toISOString().slice(0, 10);

      queryClient.setQueryData<Booking[]>(queryKey, (old = []) => {
        // Compare using local dates to avoid timezone shift issues
        const isSameDay = (d1Str: string, d2: Date) => 
          new Date(d1Str).toDateString() === d2.toDateString();

        const existing = old.find(
          (b) => b.mealTypeId === mealTypeId && isSameDay(b.date, date)
        );

        if (existing) {
          // Update the existing booking optimistically
          return old.map((b) =>
            b.mealTypeId === mealTypeId && isSameDay(b.date, date)
              ? { ...b, status }
              : b
          );
        }

        // No row yet — add a placeholder so the UI reflects the change immediately
        const placeholder: Booking = {
          id: `__optimistic_${mealTypeId}_${date.getTime()}`,
          studentId: '',
          mealTypeId,
          date: date.toISOString(),
          status,
          lockedAt: null,
          mealType: { id: mealTypeId, name: '', servingStart: '', servingEnd: '', cutoffTime: '', perMealRate: 0 },
        };
        return [...old, placeholder];
      });

      return { previous, queryKey };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },

    // Only re-fetch on success so placeholder is replaced with real server data
    // Do NOT refetch on error, otherwise the restored previous state flashes
    onSuccess: (_data, _vars, { queryKey } = {} as any) => {
      if (queryKey) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
};
