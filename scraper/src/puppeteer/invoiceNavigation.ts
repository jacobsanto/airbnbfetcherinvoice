import { Page } from 'puppeteer';
import { config } from '../config';

export async function navigateToInvoices(page: Page, month: number, year: number): Promise<void> {
  const timeout = config.PUPPETEER_TIMEOUT;

  await page.goto('https://www.airbnb.com/hosting/financials/invoices', {
    waitUntil: 'networkidle2',
    timeout,
  });

  // Wait for the invoice page to load
  const containerSelectors = [
    '[data-testid="invoice-list"]',
    '[data-testid="financials-invoices"]',
    '.invoice-list',
    'table',
    '[role="table"]',
  ];

  let loaded = false;
  for (const sel of containerSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 15000 });
      loaded = true;
      break;
    } catch {
      // try next
    }
  }

  if (!loaded) {
    // Page may have loaded differently; proceed anyway
    await page.waitForTimeout(3000);
  }

  // Apply month/year filter
  await applyDateFilter(page, month, year);
}

async function applyDateFilter(page: Page, month: number, year: number): Promise<void> {
  // Airbnb uses various date filter UIs; try common patterns

  // Pattern 1: Year/Month dropdowns or selects
  const yearSelectSelectors = [
    'select[data-testid="year-select"]',
    'select[aria-label*="year" i]',
    'select[name="year"]',
  ];

  for (const sel of yearSelectSelectors) {
    const el = await page.$(sel);
    if (el) {
      await page.select(sel, String(year));
      await page.waitForTimeout(500);
      break;
    }
  }

  const monthSelectSelectors = [
    'select[data-testid="month-select"]',
    'select[aria-label*="month" i]',
    'select[name="month"]',
  ];

  for (const sel of monthSelectSelectors) {
    const el = await page.$(sel);
    if (el) {
      await page.select(sel, String(month).padStart(2, '0'));
      await page.waitForTimeout(500);
      break;
    }
  }

  // Pattern 2: URL query parameters (some Airbnb versions support this)
  const currentUrl = page.url();
  if (!currentUrl.includes('month=') && !currentUrl.includes('year=')) {
    const monthStr = String(month).padStart(2, '0');
    const filteredUrl = `https://www.airbnb.com/hosting/financials/invoices?year=${year}&month=${monthStr}`;
    await page.goto(filteredUrl, { waitUntil: 'networkidle2', timeout: config.PUPPETEER_TIMEOUT });
  }

  // Wait for list to update
  await page.waitForTimeout(2000);
}
