import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ENCRYPTION_KEY: z.string().length(64),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  BACKEND_API_URL: z.string().url().default('http://localhost:3001/v1'),
  INTERNAL_API_SECRET: z.string().min(1),
  PUPPETEER_HEADLESS: z.string().default('true'),
  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
  PUPPETEER_TIMEOUT: z.coerce.number().default(30000),
  SCRAPER_CONCURRENCY: z.coerce.number().default(2),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
