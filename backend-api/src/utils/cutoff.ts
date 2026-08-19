export function computeCutoffMoment(
  mealType: { servingStart: string; defaultCutoffTime: string },
  mealDate: Date
): Date {
  const [cutoffHour, cutoffMinute] = mealType.defaultCutoffTime.split(':').map(Number);
  const [servingHour, servingMinute] = mealType.servingStart.split(':').map(Number);

  const isPreviousDay =
    cutoffHour > servingHour || (cutoffHour === servingHour && cutoffMinute > servingMinute);

  // Use explicitly UTC methods to prevent server local timezone from shifting the day
  const year = mealDate.getUTCFullYear();
  const month = mealDate.getUTCMonth();
  const date = mealDate.getUTCDate();

  const cutoffMoment = new Date(year, month, isPreviousDay ? date - 1 : date, cutoffHour, cutoffMinute, 0, 0);

  return cutoffMoment;
}
