import { computeCutoffMoment } from '../src/utils/cutoff';

/**
 * Cutoff times are configured as IST (UTC+5:30) wall-clock times.
 * computeCutoffMoment returns the exact UTC instant they represent.
 * We assert on toISOString() (always UTC) so results are deterministic
 * regardless of the machine's local timezone.
 */
describe('computeCutoffMoment (IST-aware)', () => {
  const MEAL_DATE = new Date('2026-08-15T00:00:00Z');

  it('previous-day cutoff when cutoffTime > servingStart (e.g. 21:00 IST the night before)', () => {
    // 21:00 IST on Aug 14 == 15:30 UTC on Aug 14
    const cutoff = computeCutoffMoment({ defaultCutoffTime: '21:00', servingStart: '07:30' }, MEAL_DATE);
    expect(cutoff.toISOString()).toBe('2026-08-14T15:30:00.000Z');
  });

  it('same-day cutoff when cutoffTime < servingStart (lunch 09:00 IST)', () => {
    // 09:00 IST on Aug 15 == 03:30 UTC on Aug 15
    const cutoff = computeCutoffMoment({ defaultCutoffTime: '09:00', servingStart: '12:00' }, MEAL_DATE);
    expect(cutoff.toISOString()).toBe('2026-08-15T03:30:00.000Z');
  });

  it('same-day cutoff for snacks (13:00 IST)', () => {
    // 13:00 IST on Aug 15 == 07:30 UTC on Aug 15
    const cutoff = computeCutoffMoment({ defaultCutoffTime: '13:00', servingStart: '17:00' }, MEAL_DATE);
    expect(cutoff.toISOString()).toBe('2026-08-15T07:30:00.000Z');
  });

  it('same-day cutoff for dinner (17:00 IST)', () => {
    // 17:00 IST on Aug 15 == 11:30 UTC on Aug 15
    const cutoff = computeCutoffMoment({ defaultCutoffTime: '17:00', servingStart: '19:30' }, MEAL_DATE);
    expect(cutoff.toISOString()).toBe('2026-08-15T11:30:00.000Z');
  });

  it('midnight (00:00 IST) breakfast locks at 18:30 UTC the night before', () => {
    // Breakfast cutoff 00:00 IST, serving 07:00 → same-day 00:00 IST on Aug 15
    //   == 18:30 UTC on Aug 14 (midnight IST is 6:30 PM UTC previous day)
    const cutoff = computeCutoffMoment({ defaultCutoffTime: '00:00', servingStart: '07:00' }, MEAL_DATE);
    expect(cutoff.toISOString()).toBe('2026-08-14T18:30:00.000Z');
  });
});
