import client from './client';

export const getSemesterEndDate = async (): Promise<string | null> => {
  const res = await client.get<{ success: boolean; semesterEndDate: string | null }>('/config/semester-end');
  return res.data.semesterEndDate;
};

export const setSemesterEndDate = async (date: string): Promise<string> => {
  const res = await client.put<{ success: boolean; semesterEndDate: string }>('/config/semester-end', { date });
  return res.data.semesterEndDate;
};
