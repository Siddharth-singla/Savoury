import request from 'supertest';
import app from '../src/app';
import prisma from '../src/db';
import { signToken } from '../src/utils/token';

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  name: 'Test',
  email: 'test@thapar.edu',
  role: 'STUDENT',
  hostelId: 'hostel-1',
  passwordHash: '$2b$12$abcdefghijklmnopqrstuvabcdefghijklmnopqrstuvwxyz01234',
  avatarBase64: null,
  rollNo: null,
  phone: null,
  roomNo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const bearer = (user: ReturnType<typeof makeUser>) => `Bearer ${signToken(user as any)}`;

describe('Security guards', () => {
  afterEach(() => jest.restoreAllMocks());

  describe('authenticate', () => {
    it('rejects a valid token for a user that has been deleted', async () => {
      const user = makeUser();
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      const res = await request(app).get('/users/me').set('Authorization', bearer(user));
      expect(res.status).toBe(401);
    });

    it('rejects a token issued before the password was changed', async () => {
      const user = makeUser();
      const token = bearer(user);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(makeUser({ passwordHash: '$2b$12$a-completely-different-hash-value-after-reset-xxxxxxxxxxx' }) as any);
      const res = await request(app).get('/users/me').set('Authorization', token);
      expect(res.status).toBe(401);
    });

    it('uses the role from the database, not from the token', async () => {
      // Token says WARDEN_ADMIN, but the account was demoted to STUDENT.
      const tokenUser = makeUser({ role: 'WARDEN_ADMIN' });
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(makeUser({ role: 'STUDENT' }) as any);
      const res = await request(app).get('/users').set('Authorization', bearer(tokenUser));
      expect(res.status).toBe(403);
    });

    it('blocks staff accounts that have no hostel', async () => {
      const user = makeUser({ role: 'CARETAKER', hostelId: null });
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(user as any);
      const res = await request(app).get('/users').set('Authorization', bearer(user));
      expect(res.status).toBe(403);
    });
  });

  describe('opt-outs', () => {
    it('rejects a huge date range instead of looping over it', async () => {
      const user = makeUser();
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(user as any);
      const res = await request(app)
        .post('/opt-outs')
        .set('Authorization', bearer(user))
        .send({ startDate: new Date().toISOString(), endDate: '9999-01-01' });
      expect(res.status).toBe(400);
    });
  });

  describe('attendance', () => {
    it('does not let Mess Committee use override', async () => {
      const user = makeUser({ role: 'MESS_COMMITTEE' });
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(user as any);
      const res = await request(app)
        .post('/attendance/override')
        .set('Authorization', bearer(user))
        .send({ studentId: 's', mealTypeId: 'm', date: new Date().toISOString(), reason: 'x' });
      expect(res.status).toBe(403);
    });

    it('refuses check-ins for a date other than today', async () => {
      const staff = makeUser({ role: 'COUNTER_STAFF' });
      // Same object is returned for the staff lookup and the student lookup (same hostel).
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(staff as any);
      const res = await request(app)
        .post('/attendance/checkin')
        .set('Authorization', bearer(staff))
        .send({ studentId: 'student-1', mealTypeId: 'm', date: '2025-01-01T12:00:00.000Z' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/today/);
    });
  });

  describe('notices', () => {
    it("does not let a hostel admin delete another hostel's notice", async () => {
      const admin = makeUser({ role: 'CARETAKER', hostelId: 'hostel-1' });
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(admin as any);
      jest.spyOn(prisma.notice, 'findUnique').mockResolvedValue({
        id: 'n1', postedById: 'someone-else', hostelId: 'hostel-2',
        title: 't', body: 'b', targetRole: null, createdAt: new Date(),
      } as any);
      const del = jest.spyOn(prisma.notice, 'delete');
      const res = await request(app).delete('/notices/n1').set('Authorization', bearer(admin));
      expect(res.status).toBe(403);
      expect(del).not.toHaveBeenCalled();
    });
  });

  describe('setup', () => {
    it('is disabled when SETUP_TOKEN is not configured', async () => {
      delete process.env.SETUP_TOKEN;
      const res = await request(app)
        .post('/auth/setup')
        .send({ name: 'Admin', email: 'admin@thapar.edu', password: 'password123', setupToken: 'guess' });
      expect(res.status).toBe(403);
    });
  });
});
