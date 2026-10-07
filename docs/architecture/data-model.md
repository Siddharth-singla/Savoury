# Data Model

The database is PostgreSQL (Supabase) managed with Prisma
(`backend-api/prisma/schema.prisma`). A pooled `DATABASE_URL` is used at
runtime and a `DIRECT_URL` for migrations.

## Entities

| Model | Purpose |
|-------|---------|
| `Hostel` | A hostel; 1–1 with a `Mess` (one mess per hostel for MVP). |
| `HostelFeePlan` | Per-semester total fee and optional `semesterEndDate`. |
| `Mess` | The mess attached to a hostel; owns `Menu` rows. |
| `User` | Students, mess committee, and staff/admin accounts. |
| `MealType` | One row per `MealSlot` (BREAKFAST/LUNCH/DINNER): cutoff time, serving window, `perMealRate`. |
| `Menu` | A meal's items for a given mess + meal + date (JSON items). |
| `Booking` | The core scheduling entity — one per student/meal/date. |
| `Attendance` | QR-scan result for a booking; source of truth for billing. |
| `WalletAccount` / `WalletTransaction` | Per-student, per-semester wallet ledger. |
| `CashoutRequest` | Student request to cash out remaining balance. |
| `MealOptOut` | Day-level absence marker (all meals for a date). |
| `Notice` | Announcements, optionally targeted by role and/or hostel. |
| `SystemConfig` | Global key/value settings (e.g. `semester_end_date`). |
| `GuestMeal`, `Feedback`, `AuditLog` | Defined in schema (reserved for future features). |

## Enums

- **`Role`** — `STUDENT`, `MESS_COMMITTEE`, `WARDEN_ADMIN`, `CO_WARDEN`,
  `CARETAKER`, `COUNTER_STAFF`, `SUPER_ADMIN`.
- **`BookingStatus`** — `OPTED_IN` (default), `OPTED_OUT`, `LOCKED`.
- **`AttendanceResult`** — `SERVED`, `DUPLICATE`, `OVERRIDE`.
- **`TransactionType`** — `TOPUP`, `MEAL_DEDUCTION`, `CASHOUT`, `ADJUSTMENT`.
- **`CashoutStatus`** — `PENDING`, `APPROVED`, `REJECTED`, `PAID`.
- **`MealSlot`** — `BREAKFAST`, `LUNCH`, `DINNER`.

## Key integrity rules

- `Booking` is unique per `(studentId, mealTypeId, date)` — a student can
  only hold one booking per meal per day.
- `Attendance.bookingId` is unique — a booking can be served at most once
  (duplicate scans are rejected via Prisma `P2002`).
- `WalletAccount` is unique per `(studentId, semesterLabel)`.
- `MealOptOut` is unique per `(studentId, date)`.
- `Menu` is unique per `(messId, mealTypeId, date)`.

## Implicit opt-in

There is intentionally **no booking row for the default case**. A student
with no `Booking` for a meal is assumed to be eating; headcount is
computed as `totalStudents − optedOutCount`.
