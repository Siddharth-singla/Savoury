import { computeCutoffMoment } from '../src/utils/cutoff';

describe('computeCutoffMoment', () => {
  const MEAL_DATE = new Date('2026-08-15T00:00:00Z');

  it('returns previous day cutoff when cutoffTime > servingStart (breakfast)', () => {
    const cutoff = computeCutoffMoment({ defaultCutoffTime: '21:00', servingStart: '07:30' }, MEAL_DATE);
    expect(cutoff.getFullYear()).toBe(2026);
    expect(cutoff.getMonth()).toBe(7);
    expect(cutoff.getDate()).toBe(14);
    expect(cutoff.getHours()).toBe(21);
    expect(cutoff.getMinutes()).toBe(0);
  });

  it('returns same day cutoff when cutoffTime < servingStart (lunch)', () => {
    const cutoff = computeCutoffMoment({ defaultCutoffTime: '09:00', servingStart: '12:00' }, MEAL_DATE);
    expect(cutoff.getDate()).toBe(15);
    expect(cutoff.getHours()).toBe(9);
    expect(cutoff.getMinutes()).toBe(0);
  });

  it('returns same day cutoff for snacks', () => {
    const cutoff = computeCutoffMoment({ defaultCutoffTime: '13:00', servingStart: '17:00' }, MEAL_DATE);
    expect(cutoff.getDate()).toBe(15);
    expect(cutoff.getHours()).toBe(13);
  });

  it('returns same day cutoff for dinner', () => {
    const cutoff = computeCutoffMoment({ defaultCutoffTime: '17:00', servingStart: '19:30' }, MEAL_DATE);
    expect(cutoff.getDate()).toBe(15);
    expect(cutoff.getHours()).toBe(17);
  });
});
