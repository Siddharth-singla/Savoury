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

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Stricter limit for auth routes
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

