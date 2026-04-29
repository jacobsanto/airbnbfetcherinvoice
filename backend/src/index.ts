import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { accountsRoutes } from './routes/accounts';
import { jobsRoutes } from './routes/jobs';
import { invoicesRoutes } from './routes/invoices';
import { otpRoutes } from './routes/otp';
import { notificationsRoutes } from './routes/notifications';
import { schedulesRoutes } from './routes/schedules';
import { runDueSchedules } from './services/scheduleService';

const fastify = Fastify({ logger: config.NODE_ENV !== 'test' });

async function main() {
  await fastify.register(cors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  fastify.setErrorHandler(errorHandler);

  fastify.get('/v1/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  fastify.register(accountsRoutes, { prefix: '/v1/accounts' });
  fastify.register(jobsRoutes, { prefix: '/v1/jobs' });
  fastify.register(invoicesRoutes, { prefix: '/v1/invoices' });
  fastify.register(otpRoutes, { prefix: '/v1/otp' });
  fastify.register(notificationsRoutes, { prefix: '/v1/notifications' });
  fastify.register(schedulesRoutes, { prefix: '/v1/schedules' });

  await fastify.listen({ port: config.PORT, host: '0.0.0.0' });
  console.log(`Backend running on port ${config.PORT}`);

  // Daily schedule check — runs every hour, triggers jobs whose run_day matches today
  setInterval(() => runDueSchedules().catch(console.error), 60 * 60 * 1000);
  runDueSchedules().catch(console.error);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
