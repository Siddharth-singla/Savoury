import apiClient from './client';

export interface MealOptOut {
  id: string;
  studentId: string;
  date: string; // ISO date string YYYY-MM-DD
  createdAt: string;
}

export const getOptOuts = async (startDate: string, endDate: string): Promise<MealOptOut[]> => {
  const res = await apiClient.get('/opt-outs', { params: { startDate, endDate } });
  return res.data.optOuts;
};

export const setOptOuts = async (startDate: string, endDate: string): Promise<{ count: number; mealsOptedOut: number; skippedClosedMeals: number; dates: string[] }> => {
  const res = await apiClient.post('/opt-outs', { startDate, endDate });
  return res.data;
};

export const removeOptOut = async (date: string): Promise<void> => {
  await apiClient.delete(`/opt-outs/${date}`);
};

export const removeOptOutRange = async (
  startDate: string,
  endDate: string,
): Promise<{ reOptedInMeals: number; daysReOptedIn: number; dates: string[] }> => {
  const res = await apiClient.delete('/opt-outs', { data: { startDate, endDate } });
  return res.data;
};
