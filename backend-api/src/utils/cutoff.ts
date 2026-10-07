export function computeCutoffMoment(
  mealType: { servingStart: string; defaultCutoffTime: string },
  mealDate: Date
): Date {
  const [cutoffHour, cutoffMinute] = mealType.defaultCutoffTime.split(':').map(Number);
  const [servingHour, servingMinute] = mealType.servingStart.split(':').map(Number);

  // Cutoff is before serving time → cutoff is on the PREVIOUS calendar day
  const isPreviousDay =
    cutoffHour > servingHour || (cutoffHour === servingHour && cutoffMinute > servingMinute);

  // Always use UTC methods so the result is timezone-invariant.
  // mealDate is already UTC-normalised (midnight UTC), so we must build
  // the cutoff in UTC too — otherwise new Date(y, m, d, h, min) would
  // interpret the values in the server's LOCAL timezone.
  const year  = mealDate.getUTCFullYear();
  const month = mealDate.getUTCMonth();
  const day   = mealDate.getUTCDate();

  const cutoffMoment = new Date(
    Date.UTC(year, month, isPreviousDay ? day - 1 : day, cutoffHour, cutoffMinute, 0, 0)
  );

  return cutoffMoment;
}
