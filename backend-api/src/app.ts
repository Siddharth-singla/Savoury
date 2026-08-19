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

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/menu', menuRoutes);
app.use('/bookings', bookingRoutes);
app.use('/attendance', attendanceRoutes);

app.use('/hostels', hostelRoutes);
app.use('/users', userRoutes);
app.use('/wallet', walletRoutes);

app.use(errorMiddleware);

export default app;

