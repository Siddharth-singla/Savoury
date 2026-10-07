# Web Console

Vite + React + react-router admin/warden/staff console in `web/`.

## Audience & pages

The web console is for staff and administrators (students use the mobile
app). Key pages:

| Page | Who | Purpose |
|------|-----|---------|
| Setup / Login | — | First super-admin setup; staff login |
| Users | Hostel admins, Super Admin | Directory + Add User / Add Mess Staff, roles |
| Hostels | Super Admin | Create hostels & fee plans |
| Menu | Committee, hostel admins | Plan meals per day |
| Headcount | Committee, hostel admins | Expected vs. served per meal (live) |
| Check-In | Staff, committee, hostel admins | Serve students (QR / roster) |
| Wallet | Hostel admins | Top-ups and cashout approvals |
| Notices | Committee, hostel admins | Post / delete hostel notices |

## Environment (`.env`)

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend base URL (default `http://localhost:3000`) |
| `VITE_DEFAULT_MEAL_TYPE_ID` | Optional default meal for the scanner |

## Scripts

| Script | Action |
|--------|--------|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview the production build |

## Headcount badges

Each meal card shows a live status badge over its lifecycle (IST):
**Upcoming** (grey) → **Final** (orange, cutoff passed) → **Active**
(serving) → **Over** (red, serving ended), plus live Expected vs. Served
counts and a served percentage.

## Deployment

Deployed on Vercel. Set `VITE_API_URL` to the deployed backend; the
backend's `FRONTEND_URL` must match the web origin for CORS.
