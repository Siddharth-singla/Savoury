# Backend API

Express + TypeScript + Prisma REST API in `backend-api/`.

## Scripts (`package.json`)

| Script | Action |
|--------|--------|
| `npm run dev` | Run with `ts-node` (development) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm test` | Run the Jest test suite |
| `npm run seed` | Seed meal types via `prisma db seed` |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:studio` | Open Prisma Studio |

## Environment (`.env`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Pooled Postgres connection (runtime) |
| `DIRECT_URL` | Direct connection (migrations) |
| `JWT_SECRET` | Secret for signing JWTs (required; server refuses to boot without it) |
| `PORT` | Server port (default 3000) |
| `FRONTEND_URL` | Allowed CORS origin (default `http://localhost:5173`) |
| `RATE_LIMIT_MAX` | Global rate limit per 15 min (default 2000) |
| `AUTH_RATE_LIMIT_MAX` | Auth rate limit per 15 min (default 30) |

## Routers

| Base path | Responsibility |
|-----------|----------------|
| `/auth` | Setup (first super admin), register (students), login |
| `/users` | User CRUD + role changes (hostel-admins & super admin) |
| `/hostels` | Hostels & fee plans (super admin) |
| `/menu` | View menus (all) and update menus (committee / hostel-admins) |
| `/bookings` | Student bookings, toggle, and headcount summary |
| `/opt-outs` | Day-level batch opt-out / opt-in calendar |
| `/attendance` | Roster, mark-served / check-in, override |
| `/wallet` | Wallet, transactions, top-up, cashout request/resolve |
| `/notices` | List / create / delete notices (hostel-scoped) |
| `/config` | Read/write semester-end date |
| `/health` | Liveness probe |

## Deployment

Deployed on Render (`render.yaml`): build runs
`npm install && npx prisma generate && npm run build`; start runs
`npm start`. The build regenerates the Prisma client, so schema/enum
changes are picked up on deploy.
