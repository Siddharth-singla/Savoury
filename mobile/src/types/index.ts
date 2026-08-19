export interface Hostel {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'MESS_COMMITTEE' | 'WARDEN_ADMIN' | 'COUNTER_STAFF' | 'SUPER_ADMIN';
  hostelId: string | null;
  hostelName?: string;
  walletBalance?: string | number;
}

export interface AuthTokenPayload {
  userId: string;
  role: string;
  hostelId: string | null;
  exp: number;
  iat: number;
}

export interface MealType {
  id: string;
  name: string;
  servingStart: string;
  servingEnd: string;
  cutoffTime: string;
  perMealRate: number;
}

export interface MenuItem {
  id: string;
  mealTypeId: string;
  date: string;
  items: Record<string, unknown>;
  mealType: MealType;
}

export interface Booking {
  id: string;
  studentId: string;
  mealTypeId: string;
  date: string;
  status: 'OPTED_IN' | 'OPTED_OUT' | 'LOCKED';
  lockedAt: string | null;
  mealType: MealType;
}

export interface MenuResponse {
  mealTypes: MealType[];
  menus: MenuItem[];
}

export interface Deduction {
  id: string;
  date: string;
  mealName: string;
  amount: number;
  scannedAt: string;
}

export interface WalletData {
  walletBalance: string | number; // Decimal comes back as string or number depending on parser
  deductions: Deduction[];
}



export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface RegisterResponse {
  user: User;
}

