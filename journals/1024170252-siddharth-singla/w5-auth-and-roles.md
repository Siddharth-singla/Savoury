# Week 5 : Authentication and Role Management

*Date: 8 September 2026*

## Context

The system has seven roles, and each hostel's staff must only touch their
own hostel's data.

## Observation

- Trusting the role or hostel stored in a token is risky, because it goes
  stale as soon as an admin changes it.
- Staff accounts should never be self-registered, and students must only
  ever be able to create Student accounts.

## Resolution

- Built register and login with bcrypt hashing and JWT sessions, restricted
  registration to college e-mail addresses.
- Added `authenticate` and `authorizeRoles` middleware, with the role groups
  defined once in `constants/roles.ts`.
- Enforced the one Warden and one Co-Warden per hostel rule and the
  hostel-scoped user management for wardens.
- Added the one-time Super Admin setup endpoint.
