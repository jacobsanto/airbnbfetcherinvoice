import IORedis from 'ioredis';
import { config } from '../config';

export const INVOICE_QUEUE_NAME = 'invoice-downloads';

export const redisConnection = new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
});
