import { Worker } from 'bullmq';
import { config } from './config';
import { redisConnection, INVOICE_QUEUE_NAME } from './lib/queue';
import { processInvoiceJob, InvoiceJobData } from './worker/invoiceWorker';
import { closeBrowser } from './puppeteer/browser';

console.log('Scraper worker starting...');

const worker = new Worker<InvoiceJobData>(
  INVOICE_QUEUE_NAME,
  async (job) => {
    console.log(`Processing job ${job.id} — type: ${job.name}`);
    if (job.name === 'fetch-invoices' || job.name === 'test-login') {
      await processInvoiceJob(job.data);
    }
  },
  {
    connection: redisConnection,
    concurrency: config.SCRAPER_CONCURRENCY,
  }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await worker.close();
  await closeBrowser();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await worker.close();
  await closeBrowser();
  process.exit(0);
});

console.log(`Worker listening on queue "${INVOICE_QUEUE_NAME}" with concurrency ${config.SCRAPER_CONCURRENCY}`);
