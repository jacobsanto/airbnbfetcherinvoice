import { Page, Protocol } from 'puppeteer';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { encrypt, decrypt } from '../lib/crypto';

export async function loadSession(page: Page, accountId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('airbnb_accounts')
    .select('session_cookie, session_cookie_iv, session_expires_at')
    .eq('id', accountId)
    .single();

  if (!data?.session_cookie || !data.session_cookie_iv) return false;

  const expiresAt = data.session_expires_at ? new Date(data.session_expires_at) : null;
  if (!expiresAt || expiresAt < new Date()) return false;

  try {
    const cookieJson = decrypt(data.session_cookie, data.session_cookie_iv);
    const cookies: Protocol.Network.CookieParam[] = JSON.parse(cookieJson);
    await page.setCookie(...cookies);
    return true;
  } catch {
    return false;
  }
}

export async function saveSession(page: Page, accountId: string): Promise<void> {
  const cookies = await page.cookies();
  const cookieJson = JSON.stringify(cookies);
  const { encrypted, iv } = encrypt(cookieJson);

  // Session valid for 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await supabaseAdmin
    .from('airbnb_accounts')
    .update({
      session_cookie: encrypted,
      session_cookie_iv: iv,
      session_expires_at: expiresAt,
      last_login_at: new Date().toISOString(),
    })
    .eq('id', accountId);
}

export async function isSessionValid(page: Page): Promise<boolean> {
  try {
    const response = await page.goto('https://www.airbnb.com/hosting', {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });
    const url = page.url();
    return !url.includes('/login') && !url.includes('/authenticate');
  } catch {
    return false;
  }
}
