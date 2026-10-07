**UCS503: Software Engineering (Project)**  
**TIET Patiala**

# Savoury — Hostel Mess Management System

**Author(s)**:

- `1024170252` Siddharth Singla
- `1024170253` Vineet Tripathi
- `1024170249` Shivansh Sahu

Savoury is a hostel mess (dining-hall) management platform. It
provides a shared backend API with a student mobile app and an
admin/staff web console for per-meal opt-in/opt-out booking,
cutoff-driven locking, QR/roster-based attendance, and a wallet
ledger with top-ups and semester-end cashouts.

## Components

- **`code/backend-api`** — Express + TypeScript + Prisma (PostgreSQL)
  REST API shared by all clients.
- **`code/mobile`** — Expo / React Native student app.
- **`code/web`** — Vite + React admin / warden / staff console.

## Running the backend

``` shell
cd code/backend-api
npm install
npx prisma generate
npm run dev
```

## Running the web console

``` shell
cd code/web
npm install
npm run dev
```

## Running the mobile app

``` shell
cd code/mobile
npm install
npx expo start
```

See the [project proposal](https://github.com/Siddharth-singla/Savoury/tree/main/project-proposal)
for the full requirements and design.
