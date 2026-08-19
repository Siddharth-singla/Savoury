import 'dotenv/config';
import app from './app';
import { initCronJobs } from './services/cron.service';

const PORT = process.env.PORT ?? 3000;

app.listen(PORT as number, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (0.0.0.0)`);
  initCronJobs();
});
