// ============================================================
// Role groupings — single source of truth for authorization.
// ============================================================
//
// The system has three "hostel admin" roles that share an identical
// feature set (notices, menu, headcount, check-in, wallet, user mgmt):
//
//   - WARDEN_ADMIN  ("Warden")    — 1 per hostel
//   - CO_WARDEN     ("Co-Warden") — 1 per hostel
//   - CARETAKER     ("Caretaker") — unlimited per hostel
//
// They differ in exactly ONE respect: only WARDEN_ADMIN and CO_WARDEN
// may add Mess Staff (COUNTER_STAFF). Caretakers cannot.
//
// COUNTER_STAFF ("Mess Staff") is check-in only and adds no one.

export const ALL_ROLES = [
  'STUDENT',
  'MESS_COMMITTEE',
  'WARDEN_ADMIN',
  'CO_WARDEN',
  'CARETAKER',
  'COUNTER_STAFF',
  'SUPER_ADMIN',
] as const;

export type RoleName = (typeof ALL_ROLES)[number];

/**
 * The three hostel-admin roles that behave identically to a Warden
 * everywhere the system previously authorized only WARDEN_ADMIN.
 */
export const HOSTEL_ADMIN_ROLES: RoleName[] = ['WARDEN_ADMIN', 'CO_WARDEN', 'CARETAKER'];

/**
 * Hostel-admin roles that are additionally allowed to add Mess Staff.
 * Caretaker is intentionally excluded.
 */
export const MESS_STAFF_MANAGER_ROLES: RoleName[] = ['WARDEN_ADMIN', 'CO_WARDEN'];

/**
 * Roles that represent app-using "students" (the only roles a hostel
 * admin may toggle between via the inline role control).
 */
export const STUDENT_ROLES: RoleName[] = ['STUDENT', 'MESS_COMMITTEE'];

/** True if the given role is one of the three Warden-equivalent admin roles. */
export const isHostelAdmin = (role: string): boolean =>
  (HOSTEL_ADMIN_ROLES as string[]).includes(role);

/** True if the given role may add Mess Staff (Warden / Co-Warden only). */
export const canManageMessStaff = (role: string): boolean =>
  (MESS_STAFF_MANAGER_ROLES as string[]).includes(role);

/** True if the role is a student-type app user. */
export const isStudentRole = (role: string): boolean =>
  (STUDENT_ROLES as string[]).includes(role);
