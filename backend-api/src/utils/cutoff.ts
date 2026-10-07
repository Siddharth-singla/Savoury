// All meal clock times (serving windows and cutoff times) are configured as
// wall-clock times in the mess's local timezone — India Standard Time (IST),
// which is UTC+5:30 and has no daylight saving. Meal dates are stored at UTC
// midnight. computeCutoffMoment converts a configured IST cutoff into the exact
// UTC instant it represents, so comparisons against `new Date()` (UTC) and the
// values rendered by clients are correct for users in India.
const IST_OFFSET_MINUTES = 5 * 60 + 30; // UTC+5:30

export function computeCutoffMoment(
  mealType: { servingStart: string; defaultCutoffTime: string },
  mealDate: Date
): Date {
  const [cutoffHour, cutoffMinute] = mealType.defaultCutoffTime.split(':').map(Number);
  const [servingHour, servingMinute] = mealType.servingStart.split(':').map(Number);

  // Cutoff is after serving START (in the same day's clock) → the cutoff is
  // meant for the PREVIOUS calendar day (e.g. a 20:00 cutoff for a 07:00 meal
  // means "the evening before"). Compared on IST wall-clock values, which is
  // how both times are configured.
  const isPreviousDay =
    cutoffHour > servingHour || (cutoffHour === servingHour && cutoffMinute > servingMinute);

  // mealDate is UTC-normalised (midnight UTC) and represents the meal's
  // calendar day. Build the cutoff as an IST wall-clock moment on the correct
  // day, expressed as a UTC timestamp, then subtract the IST offset to get the
  // true UTC instant: UTC = IST - 5:30.
  const year  = mealDate.getUTCFullYear();
  const month = mealDate.getUTCMonth();
  const day   = mealDate.getUTCDate();

  const istWallClockAsUtc = Date.UTC(
    year, month, isPreviousDay ? day - 1 : day, cutoffHour, cutoffMinute, 0, 0
  );

  return new Date(istWallClockAsUtc - IST_OFFSET_MINUTES * 60 * 1000);
}
