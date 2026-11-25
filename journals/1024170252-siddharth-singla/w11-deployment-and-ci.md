# Week 11 : Deployment and CI

*Date: 16 October 2026*

## Context

The team needed the backend running somewhere the web and mobile clients
could reach, plus a check that every pull request still builds.

## Observation

- Render's free plan and Supabase's pooled connections limit how many
  database connections we can afford.
- A shared test database is awkward, so the API tests should not need one.

## Resolution

- Deployed the API on Render in the Singapore region, with the database on
  Supabase using the pooled connection at runtime and the direct one for
  migrations.
- Set up GitHub Actions to build the backend, run the Jest suites, apply
  every migration to a fresh PostgreSQL and check it matches the schema.
- Kept secrets in environment variables and out of the repository.
- Lowered the dashboard polling rate to protect connections used by
  check-ins.
