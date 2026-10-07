# System Overview

Savoury is a hostel mess (dining-hall) management platform built as
**three clients against one shared backend**:

| Component | Stack | Audience |
|-----------|-------|----------|
| Backend API (`backend-api/`) | Express + TypeScript + Prisma, PostgreSQL (Supabase) | — |
| Web console (`web/`) | Vite + React + react-router | Admins, wardens, mess staff |
| Mobile app (`mobile/`) | Expo / React Native | Students |

## Request flow (backend)

The backend is a classic layered Express application:

```
routes → middleware (authenticate / authorizeRoles) → controllers (Zod + HTTP) → services (business logic) → Prisma
```

- **Entry:** `src/server.ts` loads env, starts the app on `0.0.0.0:PORT`
  (default 3000) and starts the cron jobs.
- **App wiring:** `src/app.ts` applies `helmet`, CORS (origin from
  `FRONTEND_URL`), a 10 MB JSON limit (base64 avatars), a global rate
  limiter and a stricter limiter on `/auth`, then mounts the routers:
  `/auth`, `/menu`, `/bookings`, `/attendance`, `/hostels`, `/users`,
  `/wallet`, `/opt-outs`, `/config`, `/notices`, plus `/health`.
- **Errors** funnel through `error.middleware.ts`:
  `ZodError → 400`, Prisma `P2002 → 409`, `{status,message} → that status`,
  else `500`.

## Core features

- Role-based access across five+ roles (see
  [Roles & Authorization](roles.md)).
- Per-meal **opt-in / opt-out booking** with an *implicit opt-in* model
  (no booking row = the student is eating).
- Config-driven **cutoff** enforcement, computed in IST, with an hourly
  cron job that locks bookings after cutoff.
- QR / roster-based **attendance** at the counter that deducts a
  per-meal rate from a **wallet ledger**.
- Wallet **top-ups** and **cashout requests** gated until semester end.
- **Menus**, **notices**, **hostel / fee-plan** management, and system
  config — all scoped per hostel where applicable.

## Cutoff & locking

Meal cutoff times are configured per `MealType` as **IST** wall-clock
times and converted to the correct UTC instant by
`src/utils/cutoff.ts`. A booking cannot be toggled after its cutoff, and
an hourly cron job (`src/services/cron.service.ts`) flips
`OPTED_IN → LOCKED` once the cutoff passes.

## Attendance & billing

`src/services/attendance.service.ts` is where money moves: marking a
student served (or an override walk-in) writes an `Attendance` row and,
in a single transaction, decrements the student's wallet by the meal's
`perMealRate` and records a `MEAL_DEDUCTION` transaction. Duplicate
scans are prevented atomically by a unique constraint on
`Attendance.bookingId`.
