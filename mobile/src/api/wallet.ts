import client from './client';

export interface WalletTransaction {
  id: string;
  walletAccountId: string;
  type: 'TOPUP' | 'MEAL_DEDUCTION' | 'CASHOUT';
  amount: number | string;
  note: string | null;
  createdAt: string;
  relatedAttendanceId: string | null;
}

export interface CashoutRequest {
  id: string;
  studentId: string;
  requestedAmount: number | string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface WalletBalanceResponse {
  walletBalance: string | number;
  semesterLabel: string | null;
}

export interface WalletTransactionsResponse {
  success: boolean;
  transactions: WalletTransaction[];
}

export interface CashoutResponse {
  success: boolean;
  request: CashoutRequest;
}

export const getWalletBalance = async (): Promise<WalletBalanceResponse> => {
  const res = await client.get<any>('/wallet/me');
  if (res.data.wallet) {
    return {
      walletBalance: res.data.wallet.balance,
      semesterLabel: res.data.wallet.semesterLabel,
    };
  }
  return { walletBalance: 0, semesterLabel: null };
};

export const getWalletTransactions = async (): Promise<WalletTransactionsResponse> => {
  const res = await client.get<WalletTransactionsResponse>('/wallet/me/transactions');
  return res.data;
};

export const requestCashout = async (requestedAmount: number): Promise<CashoutResponse> => {
  const res = await client.post<CashoutResponse>('/wallet/cashout-request', { requestedAmount });
  return res.data;
};
