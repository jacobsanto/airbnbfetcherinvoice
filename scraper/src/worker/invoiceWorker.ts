import { Page } from 'puppeteer';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { decrypt } from '../lib/crypto';
import { uploadPdf, uploadDebugScreenshot } from '../lib/storage';
import { newPage } from '../puppeteer/browser';
import { loadSession, saveSession, isSessionValid } from '../puppeteer/sessionManager';
import { performLogin, is2FAPage } from '../puppeteer/loginFlow';
import { handle2FA } from '../puppeteer/twoFactorFlow';
import { navigateToInvoices } from '../puppeteer/invoiceNavigation';
import { parseInvoiceList } from '../puppeteer/invoiceParser';
import { downloadPdf } from '../puppeteer/pdfDownloader';
import {
  updateJobStatus,
  createNotification,
  upsertInvoiceRecord,
  markInvoiceDownloaded,
} from './jobUpdater';

export interface InvoiceJobData {
  jobId: string;
  accountId: string;
  userId: string;
  month: number;
  year: number;
  test?: boolean;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 3000): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(delayMs * attempt);
    }
  }
  throw new Error('unreachable');
}

export async function processInvoiceJob(data: InvoiceJobData): Promise<void> {
  const { jobId, accountId, userId, month, year } = data;
  let page: Page | null = null;

  await updateJobStatus(jobId, 'running', { started_at: new Date().toISOString() });
  await createNotification(userId, jobId, 'job_started', 'Download started', `Fetching invoices for ${month}/${year}`);

  try {
    // Load account credentials
    const { data: account, error: accErr } = await supabaseAdmin
      .from('airbnb_accounts')
      .select('email, encrypted_password, encryption_iv')
      .eq('id', accountId)
      .single();

    if (accErr || !account) throw new Error(`Account ${accountId} not found`);

    const password = decrypt(account.encrypted_password, account.encryption_iv);

    // Launch page
    page = await newPage();

    // Try restoring existing session
    const sessionLoaded = await loadSession(page, accountId);
    let sessionValid = false;

    if (sessionLoaded) {
      sessionValid = await isSessionValid(page);
    }

    if (!sessionValid) {
      // Fresh login
      await withRetry(() => performLogin(page!, account.email, password));

      // Check for 2FA
      const needs2FA = await is2FAPage(page);
      if (needs2FA) {
        await updateJobStatus(jobId, 'awaiting_2fa');
        await createNotification(
          userId, jobId, '2fa_required',
          '2FA Required',
          `Enter the verification code for ${account.email} to continue the download.`
        );
        await handle2FA(page, jobId, accountId);
        await updateJobStatus(jobId, 'running');
      }

      await saveSession(page, accountId);
    }

    // Test-login jobs stop here — they only verify credentials work
    if (data.test) {
      await updateJobStatus(jobId, 'completed', {
        completed_at: new Date().toISOString(),
        invoices_found: 0,
        invoices_downloaded: 0,
      });
      await createNotification(
        userId, jobId, 'job_completed',
        'Login test passed',
        `Account ${account.email} authenticated successfully.`
      );
      await supabaseAdmin
        .from('airbnb_accounts')
        .update({ status: 'active', last_error: null })
        .eq('id', accountId);
      return;
    }

    // Navigate to invoices
    await withRetry(() => navigateToInvoices(page!, month, year));

    // Parse invoice list
    const invoices = await parseInvoiceList(page);
    await updateJobStatus(jobId, 'running', { invoices_found: invoices.length });

    if (invoices.length === 0) {
      await updateJobStatus(jobId, 'completed', {
        completed_at: new Date().toISOString(),
        invoices_found: 0,
        invoices_downloaded: 0,
      });
      await createNotification(
        userId, jobId, 'job_completed',
        'Download complete',
        `No invoices found for ${month}/${year}.`
      );
      return;
    }

    let downloadedCount = 0;

    for (const invoice of invoices) {
      const invoiceId = await upsertInvoiceRecord({
        jobId,
        accountId,
        userId,
        invoiceNumber: invoice.invoiceNumber,
        invoiceType: invoice.invoiceType,
        periodMonth: month,
        periodYear: year,
        amount: invoice.amount,
        currency: invoice.currency,
        airbnbUrl: invoice.downloadUrl,
      });

      if (!invoice.downloadUrl) continue;

      try {
        const pdfBuffer = await withRetry(() => downloadPdf(page!, invoice.downloadUrl!));

        const safeInvoiceNum = (invoice.invoiceNumber ?? invoiceId).replace(/[^a-zA-Z0-9_-]/g, '_');
        const storagePath = `${userId}/${accountId}/${year}/${String(month).padStart(2, '0')}/${safeInvoiceNum}.pdf`;

        await uploadPdf(pdfBuffer, storagePath);
        await markInvoiceDownloaded(invoiceId, storagePath, pdfBuffer.length);
        downloadedCount++;

        await updateJobStatus(jobId, 'running', { invoices_downloaded: downloadedCount });
        await randomDelay(2000, 5000);
      } catch (err) {
        console.error(`Failed to download invoice ${invoice.invoiceNumber}:`, err);
        await supabaseAdmin
          .from('invoices')
          .update({ status: 'failed' })
          .eq('id', invoiceId);
      }
    }

    await updateJobStatus(jobId, 'completed', {
      completed_at: new Date().toISOString(),
      invoices_found: invoices.length,
      invoices_downloaded: downloadedCount,
    });

    await createNotification(
      userId, jobId, 'job_completed',
      'Download complete',
      `Downloaded ${downloadedCount} of ${invoices.length} invoice(s) for ${month}/${year}.`,
      { invoices_found: invoices.length, invoices_downloaded: downloadedCount }
    );

    // Update account status
    await supabaseAdmin
      .from('airbnb_accounts')
      .update({ status: 'active', last_error: null })
      .eq('id', accountId);

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Job ${jobId} failed:`, message);

    // Save debug screenshot
    if (page) {
      try {
        const screenshot = await page.screenshot({ type: 'png', fullPage: true }) as Buffer;
        await uploadDebugScreenshot(screenshot, `job-${jobId}-failure-${Date.now()}.png`);
      } catch {
        // ignore screenshot errors
      }
    }

    await updateJobStatus(jobId, 'failed', {
      error_message: message,
      completed_at: new Date().toISOString(),
    });
    await createNotification(
      userId, jobId, 'job_failed',
      'Download failed',
      `Invoice download for ${month}/${year} failed: ${message}`
    );
    await supabaseAdmin
      .from('airbnb_accounts')
      .update({ status: 'error', last_error: message })
      .eq('id', accountId);
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  return sleep(minMs + Math.random() * (maxMs - minMs));
}
