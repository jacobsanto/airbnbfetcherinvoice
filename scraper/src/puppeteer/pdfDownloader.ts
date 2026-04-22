import { Page } from 'puppeteer';
import { config } from '../config';

export async function downloadPdf(page: Page, url: string): Promise<Buffer> {
  // Extract session cookies from the Puppeteer page
  const cookies = await page.cookies('https://www.airbnb.com');
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

  // Use native fetch with session cookies — more reliable than CDP download interception
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.PUPPETEER_TIMEOUT);

  try {
    const response = await fetch(url, {
      headers: {
        Cookie: cookieHeader,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://www.airbnb.com/hosting/financials/invoices',
        Accept: 'application/pdf,*/*',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`PDF download failed with status ${response.status}: ${url}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}
