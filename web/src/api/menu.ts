import client from './client';

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
  items: Record<string, string[]>;
  mealType: MealType;
}

export interface MenuResponse {
  mealTypes: MealType[];
  menus: MenuItem[];
}

export const getMenu = async (startDate: string, endDate: string): Promise<MenuResponse> => {
  const res = await client.get<MenuResponse>('/menu', { params: { startDate, endDate } });
  return res.data;
};

export const getMealTypes = async (): Promise<MealType[]> => {
  // Fetch a 1-day range just to get the mealTypes list — the dates don't matter for this query
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();
  const res = await client.get<MenuResponse>('/menu', { params: { startDate, endDate } });
  return res.data.mealTypes;
};

export const upsertMenu = async (menus: { mealTypeId: string; date: string; items: Record<string, string[]> }[]) => {
  const res = await client.put('/menu', { menus });
  return res.data;
};
