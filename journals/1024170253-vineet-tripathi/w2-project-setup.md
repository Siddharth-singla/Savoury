# Week 2 : Project Setup and Requirements

*Date: 12 August 2026*

## Context

Kicked off Savoury after picking the hostel mess problem: flat mess fees,
food planned from guesswork and attendance kept in registers and WhatsApp
groups. Needed a shared structure for three people working on a backend, a
web console and a mobile app.

## Observation

- The hard part of the project is business rules (IST cutoffs, implicit
  opt-in, transactional billing, hostel scoping), not algorithms.
- Splitting early into `backend-api/`, `web/` and `mobile/` under `code/`
  keeps ownership clear: I take the backend, Vineet the web console and
  Shivansh the mobile app.

## Resolution

- Set up the repository, the MkDocs documentation site and the journal
  folders.
- Chose the stack: Express with TypeScript, Prisma over PostgreSQL and Zod
  for validation on the backend.
- Wrote the first product requirements and project proposal, with the scope
  and the deferred items (guest meals, feedback, audit log) agreed with the
  team.
