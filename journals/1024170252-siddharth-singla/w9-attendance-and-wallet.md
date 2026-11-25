# Week 9 : Counter Check-in and Wallet Billing

*Date: 6 October 2026*

## Context

This is the one place where money moves: serving a student at the counter
must record attendance and charge the wallet together.

## Observation

- Two counters serving the same student at once could charge twice.
- A wallet could go below zero if the balance check and the deduction were
  separate steps.

## Resolution

- Wrapped the attendance insert, the conditional balance decrement and the
  ledger entry in one Prisma transaction, so any failure rolls back all
  three.
- Used the unique constraint on attendance to turn a repeat serve into a
  harmless DUPLICATE result, which also makes offline replays safe.
- Added wallet top-ups, the walk-in override with a required reason and the
  headcount endpoint.
