import apiClient from './client';
import type { Booking } from '../types';

export const getBookings = async (startDate: Date, endDate: Date): Promise<Booking[]> => {
  const res = await apiClient.get<Booking[]>('/bookings', {
    params: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
  });
  return res.data;
};

export const toggleBooking = async (
  mealTypeId: string,
  dateIsoString: string,
  status: 'OPTED_IN' | 'OPTED_OUT'
): Promise<{ success: boolean; booking: Booking }> => {
  const res = await apiClient.put<{ success: boolean; booking: Booking }>('/bookings/toggle', {
    mealTypeId,
    date: dateIsoString,
    status,
  });
  return res.data;
};
