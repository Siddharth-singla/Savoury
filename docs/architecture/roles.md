# Roles & Authorization

Authentication is stateless JWT (bcrypt-hashed passwords, 7-day tokens).
`authenticate` verifies the bearer token and sets `req.user`;
`authorizeRoles(...)` guards each route. Fine-grained rules are enforced
in the controllers. Role groups live in
`backend-api/src/constants/roles.ts`.

## Roles

| Role | Description |
|------|-------------|
| `STUDENT` | A hostel resident; uses the mobile app to book/opt-out meals and manage their wallet. |
| `MESS_COMMITTEE` | A student with menu/notice/headcount privileges. |
| `WARDEN_ADMIN` | **Warden** — full hostel-admin privileges; one per hostel. |
| `CO_WARDEN` | **Co-Warden** — identical privileges to Warden; one per hostel. |
| `CARETAKER` | Same as Warden **except cannot add Mess Staff**; unlimited per hostel. |
| `COUNTER_STAFF` | **Mess Staff** — check-in/serve only; added by Warden/Co-Warden. |
| `SUPER_ADMIN` | System administrator; manages hostels and all users. |

The three **hostel-admin** roles (Warden, Co-Warden, Caretaker) share an
identical feature set everywhere `WARDEN_ADMIN` is authorized.

## Who can add / manage whom

| Actor | Can create |
|-------|-----------|
| Super Admin | Warden (1/hostel), Co-Warden (1/hostel), unlimited Caretakers + anyone |
| Warden / Co-Warden | Mess Staff (unlimited) |
| Caretaker | — (cannot add Mess Staff) |
| Mess Staff | — |

Additional rules enforced server-side:

- Exactly **1 Warden + 1 Co-Warden per hostel** (the second is rejected);
  unlimited Caretakers and Mess Staff.
- Hostel admins **cannot modify or delete each other** — only a Super
  Admin can manage Warden/Co-Warden/Caretaker accounts.
- A hostel admin's inline role control may only toggle a student between
  `STUDENT` and `MESS_COMMITTEE`.
- A **Mess Staff** account's role is fixed (added independently; to change
  it, delete and recreate).

## Hostel scoping

Non-super-admin roles are scoped to their own `hostelId`. Super Admin may
pass `?hostelId=` to target a specific hostel (or defaults to the first).
Notices and menus are visible only within the relevant hostel.
