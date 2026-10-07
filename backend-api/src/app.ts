import express from 'express';
import cors from 'cors';
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

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/auth', authRoutes);
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

