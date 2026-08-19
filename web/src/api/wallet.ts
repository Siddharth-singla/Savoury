import api from './client';

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  note?: string;
  createdAt: string;
}

export interface WalletAccount {
  id: string;
  balance: number;
  semesterLabel: string;
}

export interface CashoutRequest {
  id: string;
  studentId: string;
  semesterLabel: string;
  requestedAmount: number;
  status: string;
  requestedAt: string;
  student: {
    name: string;
    rollNo: string;
    email: string;
  };
}

export const topupWallet = async (payload: { studentId: string; amount: number; semesterLabel: string; note?: string }) => {
  const res = await api.post('/wallet/topup', payload);
  return res.data;
};

export const getCashoutRequests = async (status: string = 'PENDING') => {
  const res = await api.get('/wallet/cashout-requests', { params: { status } });
  return res.data;
};

export const resolveCashoutRequest = async (id: string, status: 'APPROVED' | 'REJECTED', resolutionNote?: string) => {
  const res = await api.post(`/wallet/cashout-requests/${id}/resolve`, { status, resolutionNote });
  return res.data;
};
