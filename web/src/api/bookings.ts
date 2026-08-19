import client from './client';

export interface HeadcountEntry {
  mealTypeId: string;
  mealTypeName: string;
  count: number;
  totalStudents: number;
  optedOutCount: number;
  locked: boolean;
  cutoffAt: string;
}

export interface HeadcountResponse {
  date: string;
  headcounts: HeadcountEntry[];
}

export const getHeadcount = async (date: string): Promise<HeadcountResponse> => {
  const res = await client.get<HeadcountResponse>('/bookings/headcount', {
    params: { date: new Date(date).toISOString() },
  });
  return res.data;
};
