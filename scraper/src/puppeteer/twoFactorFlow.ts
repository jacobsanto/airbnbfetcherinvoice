import { Page } from 'puppeteer';
import { config } from '../config';
import { supabaseAdmin } from '../lib/supabaseAdmin';

const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS = 10 * 60 * 1000; // 10 minutes

export async function handle2FA(page: Page, jobId: string, accountId: string): Promise<void> {
  // Create OTP request record
  await supabaseAdmin.from('otp_requests').insert({
    job_id: jobId,
    account_id: accountId,
  });

  // Poll backend for OTP submission
  const deadline = Date.now() + MAX_WAIT_MS;
  let otpCode: string | null = null;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    try {
      const res = await fetch(`${config.BACKEND_API_URL}/otp/${jobId}`, {
        headers: { 'x-internal-secret': config.INTERNAL_API_SECRET },
      });
      const data = (await res.json()) as { status: string; otp_code: string | null };

      if (data.status === 'received' && data.otp_code) {
        otpCode = data.otp_code;
        break;
      }
    } catch {
      // network error, continue polling
    }
  }

  if (!otpCode) {
    throw new Error('2FA timeout: no OTP submitted within 10 minutes');
  }

  // Find and fill OTP input
  const otpSelectors = [
    'input[data-testid="otp-input"]',
    'input[name="otp"]',
    'input[autocomplete="one-time-code"]',
    'input[type="number"]',
    'input[inputmode="numeric"]',
  ];

  let filled = false;
  for (const sel of otpSelectors) {
    const el = await page.$(sel);
    if (el) {
      await el.click({ clickCount: 3 });
      await el.type(otpCode, { delay: 80 });
      filled = true;
      break;
    }
  }

  if (!filled) {
    throw new Error('Could not find OTP input field on page');
  }

  // Submit
  const submitSelectors = ['button[type="submit"]', '[data-testid="submit-btn"]'];
  for (const sel of submitSelectors) {
    const el = await page.$(sel);
    if (el) {
      await el.click();
      break;
    }
  }

  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: config.PUPPETEER_TIMEOUT }).catch(() => {});
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
