# Week 1 : Meal Cutoffs Firing at the Wrong Time

## Context

The Headcount dashboard was marking meals "Final" (cutoff passed) at the
wrong times, and in the early morning it showed *all* meals as Final.
Cutoff times are configured per `MealType` (Breakfast 00:00, Lunch 09:00,
Dinner 14:00) and are meant to be local (IST) wall-clock times.

## Observation

Two separate timezone bugs:

1. **Cutoff computed in UTC.** `computeCutoffMoment` built the cutoff with
   `Date.UTC(y, m, d, h, m)`, so the configured `HH:MM` was treated as
   UTC. For India (UTC+5:30) every cutoff fired **5.5 hours late** — Lunch
   (09:00) effectively became 14:30 IST, landing inside its serving
   window.

2. **Dashboard queried the UTC day.** The web page derived "today" via
   `toISOString()` (UTC). Between 00:00–05:30 IST the UTC date is still the
   previous day, so the page requested *yesterday's* headcount — where
   every meal is already past cutoff and shows Final.

## Resolution

- Treat serving/cutoff `HH:MM` as **IST** and convert to the true UTC
  instant (`UTC = IST − 5:30`) in `src/utils/cutoff.ts`.
- Compute "today"/"tomorrow" on the dashboard as **IST calendar dates**,
  independent of the viewer's timezone, and send UTC-midnight of that IST
  date to the API.
- Rewrote the cutoff tests to assert exact UTC instants via
  `toISOString()` (deterministic across machines) instead of local-time
  getters.

**Result:** at 03:10 IST only Breakfast is Final; Lunch and Dinner remain
Upcoming until their real IST cutoffs.
