# Week 13 : Security Hardening

*Date: 29 October 2026*

## Context

With the main flows working, I reviewed the API for ways to misuse it.

## Observation

Several real gaps turned up:

- Check-in accepted any date, so a staff account could drain a wallet.
- Tokens stayed valid after a user was deleted or changed password, and the
  role was read from the token.
- Staff accounts without a hostel slipped past the same-hostel checks.
- Behind Render's proxy, the rate limiter put every user in one bucket.

## Resolution

- Restricted check-in to today's meals within the serving window.
- Reloaded role and hostel from the database on every request and tied
  tokens to a password fingerprint.
- Blocked staff without a hostel, capped date ranges and added the
  insufficient-balance guard.
- Added helmet, a CORS allow-list, body limits and rate limits, and fixed
  the proxy setting.
