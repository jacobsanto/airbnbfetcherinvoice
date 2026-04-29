import { supabase } from './supabaseClient';
import * as mock from './mockApi';
import { DEMO_MODE } from './demoMode';

export { DEMO_MODE };

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = await getAuthHeader();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Route API calls to the mock layer when in demo mode
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRoute<T>(path: string, method: string, body?: any): Promise<T> | null {
  if (!DEMO_MODE) return null;

  const p = path.split('?')[0];
  const qs = new URLSearchParams(path.includes('?') ? path.split('?')[1] : '');

  // Accounts
  if (method === 'GET' && p === '/accounts') return mock.listAccounts() as Promise<T>;
  if (method === 'POST' && p === '/accounts') return mock.createAccount(body) as Promise<T>;
  if (method === 'PUT' && p.match(/^\/accounts\/[^/]+$/) && !p.endsWith('/test'))
    return mock.updateAccount(p.split('/')[2], body) as Promise<T>;
  if (method === 'DELETE' && p.match(/^\/accounts\/[^/]+$/) && !p.includes('/test'))
    return mock.deleteAccount(p.split('/')[2]) as Promise<T>;
  if (method === 'POST' && p.match(/^\/accounts\/[^/]+\/test$/))
    return mock.testLogin(p.split('/')[2]) as Promise<T>;

  // Jobs
  if (method === 'GET' && p === '/jobs')
    return mock.listJobs({ status: qs.get('status') ?? undefined, limit: Number(qs.get('limit') || 50) }) as Promise<T>;
  if (method === 'POST' && p === '/jobs') return mock.createJob(body) as Promise<T>;
  if (method === 'DELETE' && p.match(/^\/jobs\/[^/]+$/))
    return mock.cancelJob(p.split('/')[2]) as Promise<T>;

  // Invoices
  if (method === 'GET' && p === '/invoices')
    return mock.listInvoices({
      account_id: qs.get('account_id') ?? undefined,
      year: qs.get('year') ? Number(qs.get('year')) : undefined,
      month: qs.get('month') ? Number(qs.get('month')) : undefined,
      limit: Number(qs.get('limit') || 100),
    }) as Promise<T>;
  if (method === 'GET' && p.match(/^\/invoices\/[^/]+\/download$/))
    return mock.getInvoiceDownloadUrl(p.split('/')[2]) as Promise<T>;

  // Notifications
  if (method === 'GET' && p === '/notifications') return mock.listNotifications() as Promise<T>;
  if (method === 'PUT' && p === '/notifications/read-all') return mock.markAllRead() as Promise<T>;

  // Schedules
  if (method === 'GET' && p === '/schedules') return mock.listSchedules() as Promise<T>;
  if (method === 'PUT' && p === '/schedules') return mock.upsertSchedule(body) as Promise<T>;
  if (method === 'DELETE' && p.match(/^\/schedules\/[^/]+$/))
    return mock.deleteSchedule(p.split('/')[2]) as Promise<T>;

  return null;
}

export const api = {
  get: <T>(path: string): Promise<T> => mockRoute<T>(path, 'GET') ?? request<T>(path),
  post: <T>(path: string, body: unknown): Promise<T> => mockRoute<T>(path, 'POST', body) ?? request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown): Promise<T> => mockRoute<T>(path, 'PUT', body) ?? request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string): Promise<T> => mockRoute<T>(path, 'DELETE') ?? request<T>(path, { method: 'DELETE' }),
};
