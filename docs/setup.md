# Setup & Running

## Prerequisites

- Node.js 18+ and npm
- A PostgreSQL database (the project uses Supabase)

## 1. Backend API

``` shell
cd backend-api
npm install
cp .env.example .env        # fill in DATABASE_URL, DIRECT_URL, JWT_SECRET
npx prisma migrate deploy   # apply migrations
npx prisma generate         # generate the Prisma client
npm run seed                # seed meal types (optional)
npm run dev                 # starts on http://localhost:3000
```

First-time bootstrap: open the **web console** and complete the Setup
page to create the first `SUPER_ADMIN`.

## 2. Web console

``` shell
cd web
npm install
# .env: VITE_API_URL=http://localhost:3000
npm run dev                 # starts on http://localhost:5173
```

!!! note "CORS"
    The backend only accepts the origin in its `FRONTEND_URL`
    (default `http://localhost:5173`). If Vite starts on a different
    port, update `FRONTEND_URL` accordingly and restart the backend.

## 3. Mobile app

``` shell
cd mobile
npm install
npx expo start
```

Set `EXPO_PUBLIC_API_URL` to point at your backend if you are not using
the default Android-emulator host.

## Meal cutoff times

Cutoff and serving times are configured per `MealType` as **IST**
wall-clock times. The seed sets Breakfast 00:00, Lunch 09:00, Dinner
14:00 (cutoffs). To change them, edit the `MealType` rows (e.g. via
`npm run db:studio`) using the IST time you want.
