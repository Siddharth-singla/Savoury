# Week 4 : Designing the Data Model

*Date: 27 August 2026*

## Context

Before writing any endpoints, the database schema had to capture hostels,
users, meals, bookings, attendance and the wallet ledger.

## Observation

- Implicit opt-in means a missing booking row equals "eating", so only
  opt-outs need storing. That keeps headcount to a single count query.
- Unique constraints can do real work: one booking per student, meal and
  date, and one attendance per booking, which later makes double serving
  impossible at the database level.
- Money needs a ledger, not just a balance, so every change is traceable.

## Resolution

- Wrote the Prisma schema (Hostel, Mess, User, MealType, Booking,
  Attendance, WalletAccount, WalletTransaction, Notice and others) with
  the unique constraints above.
- Added the seed script for the three meal types with serving windows,
  cutoffs and the Rs. 75 rate.
- Modelled GuestMeal, Feedback and AuditLog but kept them out of the
  first release.
