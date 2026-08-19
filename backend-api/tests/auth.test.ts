import request from 'supertest';
import app from '../src/app';
import prisma from '../src/db';

describe('Auth Endpoints', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /auth/register', () => {
    it('registers a new user', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.user, 'create').mockResolvedValue({
        id: 'new-user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: 'STUDENT',
        hostelId: 'hostel-id-1',
        passwordHash: 'hashed-password',
        rollNo: null,
        phone: null,

        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          hostelId: 'cljxyz12345',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.role).toBe('STUDENT');
    });

    it('rejects an invalid email', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'Test',
          email: 'not-an-email',
          password: 'password123',
          hostelId: 'cljxyz12345',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
      expect(res.body.details[0]).toContain('email');
    });

    it('rejects a short password', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'Test',
          email: 'valid@email.com',
          password: '123',
          hostelId: 'cljxyz12345',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
    });

    it('returns 409 if email is already in use', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'existing-id',
        name: 'Existing',
        email: 'taken@example.com',
        role: 'STUDENT',
        hostelId: 'hostel-id-1',
        passwordHash: 'hashed',
        rollNo: null,
        phone: null,

        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'Someone',
          email: 'taken@example.com',
          password: 'password123',
          hostelId: 'cljxyz12345',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Email already in use');
    });
  });
});
