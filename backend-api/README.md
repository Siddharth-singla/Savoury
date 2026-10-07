# Savoury — Backend API

Express + TypeScript + Prisma REST API (PostgreSQL / Supabase) shared by
the Savoury web console and mobile app.

## Setup

``` shell
npm install
cp .env.example .env        # fill in the variables below
npx prisma migrate deploy   # apply migrations
npx prisma generate         # generate the Prisma client
npm run seed                # seed meal types (optional)
npm run dev                 # http://localhost:3000
```

## Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Pooled Postgres connection (runtime) |
| `DIRECT_URL` | Direct Postgres connection (migrations) |
| `JWT_SECRET` | JWT signing secret — **required** (server exits without it) |
| `PORT` | Server port (default 3000) |
| `FRONTEND_URL` | Allowed CORS origin (default `http://localhost:5173`) |
| `RATE_LIMIT_MAX` | Global rate limit / 15 min (default 2000) |
| `AUTH_RATE_LIMIT_MAX` | Auth rate limit / 15 min (default 30) |

## Scripts

| Script | Action |
|--------|--------|
| `npm run dev` | Development server (`ts-node`) |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run compiled server |
| `npm test` | Jest test suite |
| `npm run seed` | Seed meal types |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:studio` | Prisma Studio |

## Layout

```
src/
├── app.ts            # express app + middleware + routers
├── server.ts         # entry: starts server + cron
├── routes/           # route definitions + authorizeRoles guards
├── controllers/      # Zod validation + HTTP handling
├── services/         # business logic (auth, booking, attendance, cron, menu)
├── middleware/       # authenticate / authorizeRoles / error handler
├── constants/        # role groups (single source of truth)
├── utils/            # cutoff computation (IST-aware)
└── db.ts             # Prisma client
prisma/
├── schema.prisma     # data model
├── migrations/       # SQL migrations
└── seed.ts           # meal-type seed
```

See the full documentation under [`../docs`](../docs/index.md).

## Deployment

Render (`render.yaml`): build runs
`npm install && npx prisma generate && npm run build`, start runs
`npm start`. Set `DATABASE_URL`, `DIRECT_URL`, and `JWT_SECRET` as
service env vars.
