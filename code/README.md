# Code

Source code for Savoury. Each component is a separate npm project.

| Folder | Component | Stack |
|--------|-----------|-------|
| [`backend-api/`](backend-api) | REST API shared by all clients | Express + TypeScript + Prisma (PostgreSQL) |
| [`web/`](web) | Admin / warden / staff console | Vite + React |
| [`mobile/`](mobile) | Student app | Expo / React Native |
| [`expo-starter/`](expo-starter) | Original `create-expo-app` scaffold (not used by the product) | Expo |

The real student client is `mobile/`. `expo-starter/` is the
scaffold that `create-expo-app` generated at the start of the project;
it is kept for reference only.

## Build and run

The [`Makefile`](Makefile) in this folder wraps the common commands.
Run them from the repository root with `make -C code <target>`, or from
inside `code/` with `make <target>`.

| Target | Action |
|--------|--------|
| `install` | `npm install` in backend-api, web, and mobile |
| `backend-dev` | Start the API on <http://localhost:3000> |
| `web-dev` | Start the web console on <http://localhost:5173> |
| `mobile-dev` | Start the Expo dev server |
| `build` | Generate the Prisma client and build the API and web console |
| `test` | Run the backend test suite |

See [`docs/setup.md`](../docs/setup.md) for first-time setup, including
environment variables and database migrations.
