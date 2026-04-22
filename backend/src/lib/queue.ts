import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';

export const INVOICE_QUEUE_NAME = 'invoice-downloads';

export const redisConnection = new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const invoiceQueue = new Queue(INVOICE_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});
