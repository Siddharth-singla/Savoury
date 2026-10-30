# Savoury — Hostel Mess Management System

**UCS503: Software Engineering (Project), 2026-27 ODD — TIET Patiala**

Team:

- `1024170252` Siddharth Singla
- `1024170253` Vineet Tripathi
- `1024170249` Shivansh Sahu

Savoury is a hostel mess (dining-hall) management platform: a shared
backend API with a student mobile app and an admin/staff web console
for per-meal opt-in/opt-out booking, cutoff-driven locking,
QR/roster-based attendance, and a wallet ledger with top-ups and
semester-end cashouts.

## Repository structure

This repository follows the UCS503P project template layout:

| Folder | Contents |
|--------|----------|
| `project-proposal/` | Project Proposal (`main.tex`, `main.pdf`), SRS (`srs.tex`), PRD, diagram sources |
| `project-report-prototype-stage/` | Project Report — Prototype Stage |
| `project-report-final/` | Project Report — Final |
| `journals/` | Weekly journals, one folder per team member |
| `docs/` | Documentation (built with `mkdocs`) |
| `code/` | All source code — see [`code/README.md`](code/README.md) |
| `assets/` | Logos, icons, and stylesheets used by the docs site |

All source code is under `code/`:

| Folder | Component |
|--------|-----------|
| `code/backend-api/` | Express + TypeScript + Prisma REST API |
| `code/web/` | Vite + React admin / warden / staff console |
| `code/mobile/` | Expo / React Native student app |
| `code/expo-starter/` | Original `create-expo-app` scaffold (reference only) |

## Reports

The three reports are maintained in their respective folders:
*a)* Project Proposal, *b)* Project Report Prototype Stage, and
*c)* Project Report Final.

## Journals

Journals are stacked under `journals/`, one folder per team member.

## Docs

The `docs/` folder is an organised collection of markdown files built
with the [`mkdocs`](https://www.mkdocs.org/) backend. Any commit to the
`main` (or `master`) branch triggers a CI/CD build and deployment of the
documentation, including the journals.

For a local preview of the docs:

``` shell
make docs
```

### Local environment for docs

``` shell
pip install mkdocs mkdocs-material mkdocs-material-extensions \
  mkdocs-literate-nav mkdocs-section-index \
  mkdocs-git-revision-date-localized-plugin \
  mkdocs-git-authors-plugin pymdown-extensions
```

## Running the application

``` shell
# Backend API
cd code/backend-api && npm install && npx prisma generate && npm run dev

# Web console
cd code/web && npm install && npm run dev

# Mobile app
cd code/mobile && npm install && npx expo start
```

Or use the wrapper targets: `make -C code install`, then
`make -C code backend-dev`, `make -C code web-dev`, or
`make -C code mobile-dev`. See [`code/README.md`](code/README.md).
