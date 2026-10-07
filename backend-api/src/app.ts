import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorMiddleware } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import menuRoutes from './routes/menu.routes';
import bookingRoutes from './routes/booking.routes';
import attendanceRoutes from './routes/attendance.routes';

import hostelRoutes from './routes/hostel.routes';
import userRoutes from './routes/user.routes';
import walletRoutes from './routes/wallet.routes';
import optoutRoutes from './routes/optout.routes';
import configRoutes from './routes/config.routes';
import noticeRoutes from './routes/notice.routes';

const app = express();

// Global limiter guards against abuse but must not punish normal app usage.
// A single IP can represent many legitimate clients (e.g. a whole hostel/
// campus behind one NAT), so the ceiling is generous and env-configurable.
// Default raised from 300 -> 2000 per 15 min. The /health endpoint is
// exempt so uptime pingers never consume the budget.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX) || 2000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
  message: { error: 'Too many requests from this IP, please try again later.' },
});

// Auth stays strict — this is the limit that actually matters (brute-force).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(globalLimiter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

app.use('/auth', authLimiter, authRoutes);
app.use('/menu', menuRoutes);
app.use('/bookings', bookingRoutes);
app.use('/attendance', attendanceRoutes);

app.use('/hostels', hostelRoutes);
app.use('/users', userRoutes);
app.use('/wallet', walletRoutes);
app.use('/opt-outs', optoutRoutes);
app.use('/config', configRoutes);
app.use('/notices', noticeRoutes);

app.use(errorMiddleware);

export default app;

