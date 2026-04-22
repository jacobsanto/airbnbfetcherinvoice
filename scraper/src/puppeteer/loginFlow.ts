import { Page } from 'puppeteer';
import { config } from '../config';

async function typeWithDelay(page: Page, selector: string, text: string) {
  await page.focus(selector);
  for (const char of text) {
    await page.keyboard.type(char, { delay: 50 + Math.random() * 100 });
  }
}

export async function performLogin(page: Page, email: string, password: string): Promise<void> {
  const timeout = config.PUPPETEER_TIMEOUT;

  await page.goto('https://www.airbnb.com/login', {
    waitUntil: 'domcontentloaded',
    timeout,
  });

  // Click "Continue with email" link
  const emailLinkSelectors = [
    '[data-testid="email-login-link"]',
    'a[href*="email"]',
    'button[data-email-login]',
  ];

  for (const sel of emailLinkSelectors) {
    const el = await page.$(sel);
    if (el) {
      await el.click();
      break;
    }
  }

  // Wait for email input
  const emailInputSelectors = [
    'input[name="user[email]"]',
    'input[data-testid="email-input"]',
    'input[type="email"]',
    '#email',
  ];

  let emailInput: string | null = null;
  for (const sel of emailInputSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 8000 });
      emailInput = sel;
      break;
    } catch {
      // try next selector
    }
  }

  if (!emailInput) {
    throw new Error('Could not find email input on Airbnb login page');
  }

  await typeWithDelay(page, emailInput, email);

  // Click continue/next button
  const continueSelectors = [
    '[data-testid="submit-btn"]',
    'button[type="submit"]',
    'button[data-id="submit"]',
  ];

  for (const sel of continueSelectors) {
    const el = await page.$(sel);
    if (el) {
      await el.click();
      break;
    }
  }

  // Wait for password field
  const passwordSelectors = [
    'input[name="user[password]"]',
    'input[data-testid="password-input"]',
    'input[type="password"]',
    '#password',
  ];

  let passwordInput: string | null = null;
  for (const sel of passwordSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 8000 });
      passwordInput = sel;
      break;
    } catch {
      // try next selector
    }
  }

  if (!passwordInput) {
    throw new Error('Could not find password input on Airbnb login page');
  }

  await typeWithDelay(page, passwordInput, password);

  // Submit login form
  const submitSelectors = [
    '[data-testid="submit-btn"]',
    'button[type="submit"]',
    'button[data-id="submit"]',
  ];

  for (const sel of submitSelectors) {
    const el = await page.$(sel);
    if (el) {
      await el.click();
      break;
    }
  }

  // Wait for navigation
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout }).catch(() => {});
}

export async function is2FAPage(page: Page): Promise<boolean> {
  const url = page.url();
  if (url.includes('two_factor') || url.includes('verify') || url.includes('authenticate')) {
    return true;
  }

  const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
  return (
    pageText.includes('verification code') ||
    pageText.includes('two-step') ||
    pageText.includes('two step') ||
    pageText.includes('enter the code') ||
    pageText.includes('6-digit code')
  );
}
