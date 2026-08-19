import client from './client';

export interface RosterStudent {
  studentId: string;
  name: string;
  rollNo: string | null;
  status: 'OPTED_IN' | 'OPTED_OUT' | 'LOCKED';
  isServed: boolean;
}

export interface RosterResponse {
  success: boolean;
  roster: RosterStudent[];
}

export const getRoster = async (mealTypeId: string, date: string): Promise<RosterStudent[]> => {
  const res = await client.get<RosterResponse>('/attendance/roster', {
    params: { mealTypeId, date },
  });
  return res.data.roster;
};

export interface MarkServedPayload {
  studentId: string;
  mealTypeId: string;
  date: string;
}

export interface MarkServedResult {
  success: boolean;
  attendance: {
    id: string;
    result: 'SERVED' | 'DUPLICATE' | 'OVERRIDE';
    bookingId: string;
    scannedAt: string;
  };
}

export const checkIn = async (payload: MarkServedPayload): Promise<MarkServedResult> => {
  const res = await client.post<MarkServedResult>('/attendance/checkin', payload);
  return res.data;
};
