import request from 'supertest';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import app from '../src/app';
import prisma from '../src/db';
import { markServed } from '../src/services/attendance.service';

const enableEmail = () => {
  process.env.BREVO_API_KEY = 'test-key';
  process.env.EMAIL_FROM = 'noreply@example.org';
  process.env.API_PUBLIC_URL = 'https://api.test.example';
};
const disableEmail = () => {
  delete process.env.BREVO_API_KEY;
  delete process.env.EMAIL_FROM;
  delete process.env.API_PUBLIC_URL;
};

describe('Wallet balance check on check-in', () => {
  afterEach(() => jest.restoreAllMocks());

  const mockServe = (balance: number) => {
    jest.spyOn(prisma.booking, 'upsert').mockResolvedValue({ id: 'b1', status: 'OPTED_IN' } as any);
    const updateMany = jest.fn().mockResolvedValue({ count: balance >= 75 ? 1 : 0 });
    const txCreate = jest.fn().mockResolvedValue({});
    const tx = {
      attendance: {
        create: jest.fn().mockResolvedValue({
          id: 'a1',
          booking: { mealType: { displayName: 'Lunch', perMealRate: new Prisma.Decimal(75) } },
        }),
      },
      walletAccount: {
        findFirst: jest.fn().mockResolvedValue({ id: 'w1', balance: new Prisma.Decimal(balance) }),
        updateMany,
      },
      walletTransaction: { create: txCreate },
    };
    jest.spyOn(prisma, '$transaction').mockImplementation(async (fn: any) => fn(tx));
    return { updateMany, txCreate };
  };

  it('blocks the check-in when the balance is below the meal rate', async () => {
    const { updateMany, txCreate } = mockServe(50);
    await expect(markServed('s1', 'm1', new Date(), 'staff')).rejects.toMatchObject({
      status: 402,
      code: 'INSUFFICIENT_BALANCE',
    });
    // The decrement itself is guarded by balance >= rate
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ balance: { gte: new Prisma.Decimal(75) } }),
    }));
    expect(txCreate).not.toHaveBeenCalled();
  });

  it('blocks the check-in at zero balance', async () => {
    mockServe(0);
    await expect(markServed('s1', 'm1', new Date(), 'staff')).rejects.toMatchObject({ status: 402 });
  });

  it('allows the check-in when the balance covers the meal', async () => {
    const { txCreate } = mockServe(75);
    await expect(markServed('s1', 'm1', new Date(), 'staff')).resolves.toBeDefined();
    expect(txCreate).toHaveBeenCalled();
  });
});

describe('Email verification', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({ ok: true, text: async () => '' });
    (global as any).fetch = fetchMock;
  });
  afterEach(() => {
    jest.restoreAllMocks();
    disableEmail();
  });

  it('registers an unverified account and emails a link to the configured API URL', async () => {
    enableEmail();
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    jest.spyOn(prisma.hostel, 'findUnique').mockResolvedValue({ id: 'h1' } as any);
    const create = jest.spyOn(prisma.user, 'create').mockImplementation((async (args: any) => ({
      id: 'u1', name: 'New', email: 'new@thapar.edu', role: 'STUDENT', hostelId: 'h1', ...args.data,
    })) as any);
    jest.spyOn(prisma.emailVerification, 'findUnique').mockResolvedValue(null);
    jest.spyOn(prisma.emailVerification, 'upsert').mockResolvedValue({} as any);

    const res = await request(app).post('/auth/register').send({
      name: 'New', email: 'new@thapar.edu', password: 'password123', hostelId: 'h1',
    });

    expect(res.status).toBe(201);
    expect(res.body.verificationRequired).toBe(true);
    expect(create.mock.calls[0][0].data.emailVerified).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.to[0].email).toBe('new@thapar.edu');
    expect(sent.htmlContent).toContain('https://api.test.example/auth/verify-email?token=');
  });

  it('does not require verification while email is not configured', async () => {
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    jest.spyOn(prisma.hostel, 'findUnique').mockResolvedValue({ id: 'h1' } as any);
    const create = jest.spyOn(prisma.user, 'create').mockImplementation((async (args: any) => ({
      id: 'u1', name: 'New', email: 'new@thapar.edu', role: 'STUDENT', hostelId: 'h1', ...args.data,
    })) as any);

    const res = await request(app).post('/auth/register').send({
      name: 'New', email: 'new@thapar.edu', password: 'password123', hostelId: 'h1',
    });

    expect(res.status).toBe(201);
    expect(res.body.verificationRequired).toBe(false);
    expect(create.mock.calls[0][0].data.emailVerified).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses login for an unverified account and re-sends the link', async () => {
    enableEmail();
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'u1', name: 'New', email: 'new@thapar.edu', role: 'STUDENT', hostelId: 'h1',
      passwordHash: bcrypt.hashSync('password123', 4), emailVerified: false, hostel: null,
    } as any);
    jest.spyOn(prisma.emailVerification, 'findUnique').mockResolvedValue(null);
    jest.spyOn(prisma.emailVerification, 'upsert').mockResolvedValue({} as any);

    const res = await request(app).post('/auth/login').send({ email: 'new@thapar.edu', password: 'password123' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
    expect(res.body.accessToken).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('says "invalid email or password" (not "unverified") for a wrong password', async () => {
    enableEmail();
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'u1', email: 'new@thapar.edu', passwordHash: bcrypt.hashSync('password123', 4), emailVerified: false,
    } as any);
    const res = await request(app).post('/auth/login').send({ email: 'new@thapar.edu', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('tells the student when the email could not be sent (e.g. Brevo rejects the request)', async () => {
    enableEmail();
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => '{"message":"unrecognised IP address"}' });
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    jest.spyOn(prisma.hostel, 'findUnique').mockResolvedValue({ id: 'h1' } as any);
    jest.spyOn(prisma.user, 'create').mockImplementation((async (args: any) => ({
      id: 'u1', name: 'New', email: 'new@thapar.edu', role: 'STUDENT', hostelId: 'h1', ...args.data,
    })) as any);
    jest.spyOn(prisma.emailVerification, 'findUnique').mockResolvedValue(null);
    jest.spyOn(prisma.emailVerification, 'upsert').mockResolvedValue({} as any);
    const resetCooldown = jest.spyOn(prisma.emailVerification, 'update').mockResolvedValue({} as any);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await request(app).post('/auth/register').send({
      name: 'New', email: 'new@thapar.edu', password: 'password123', hostelId: 'h1',
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/couldn't send/);
    expect(resetCooldown).toHaveBeenCalledWith(expect.objectContaining({ data: { lastSentAt: new Date(0) } }));
  });

  it('rejects an unknown verification token', async () => {
    jest.spyOn(prisma.emailVerification, 'findUnique').mockResolvedValue(null);
    const res = await request(app).get('/auth/verify-email?token=not-a-real-token');
    expect(res.status).toBe(400);
    expect(res.text).toContain('invalid or has expired');
  });

  it('verifies the account for a valid token', async () => {
    jest.spyOn(prisma.emailVerification, 'findUnique').mockResolvedValue({
      id: 'v1', userId: 'u1', tokenHash: 'x', expiresAt: new Date(Date.now() + 60_000),
    } as any);
    const tx = jest.spyOn(prisma, '$transaction').mockResolvedValue([] as any);
    const res = await request(app).get('/auth/verify-email?token=some-valid-token');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Email verified');
    expect(tx).toHaveBeenCalled();
  });
});

describe('Manual verification by staff', () => {
  afterEach(() => jest.restoreAllMocks());
  const { signToken } = require('../src/utils/token');
  const caretaker = { id: 'c1', role: 'CARETAKER', hostelId: 'h1', passwordHash: 'hash-c1', emailVerified: true };

  it('lets a caretaker verify a student in their hostel', async () => {
    jest.spyOn(prisma.user, 'findUnique')
      .mockResolvedValueOnce(caretaker as any) // authenticate
      .mockResolvedValueOnce({ id: 's1', role: 'STUDENT', hostelId: 'h1', emailVerified: false } as any);
    const tx = jest.spyOn(prisma, '$transaction').mockResolvedValue([] as any);
    jest.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);
    const res = await request(app).post('/users/s1/verify-email').set('Authorization', `Bearer ${signToken(caretaker)}`);
    expect(res.status).toBe(200);
    expect(tx).toHaveBeenCalled();
  });

  it("refuses to verify a student from another hostel", async () => {
    jest.spyOn(prisma.user, 'findUnique')
      .mockResolvedValueOnce(caretaker as any)
      .mockResolvedValueOnce({ id: 's2', role: 'STUDENT', hostelId: 'h2', emailVerified: false } as any);
    const tx = jest.spyOn(prisma, '$transaction');
    const res = await request(app).post('/users/s2/verify-email').set('Authorization', `Bearer ${signToken(caretaker)}`);
    expect(res.status).toBe(403);
    expect(tx).not.toHaveBeenCalled();
  });
});
