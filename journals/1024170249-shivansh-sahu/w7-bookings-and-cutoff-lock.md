# Week 7 : Bookings, Opt-outs and the Hourly Lock

*Date: 22 September 2026*

## Context

Students need to opt out of meals before a cutoff, and the kitchen needs a
fixed headcount once the cutoff passes.

## Observation

- The cutoff rule must live in exactly one place, otherwise the toggle,
  the date-range opt-out and the cron job can disagree. This is also where
  the IST bug from Week 1 showed up.
- A cron job that runs hourly can lag the cutoff by up to an hour, so the
  toggle must check the cutoff itself rather than rely on the lock.

## Resolution

- Added the booking toggle endpoint with the cutoff check and one booking
  per student, meal and date.
- Built date-range opt-outs that skip meals already past their cutoff and
  report how many were skipped.
- Added the hourly node-cron job that marks open bookings as LOCKED, using
  the same cutoff function.
