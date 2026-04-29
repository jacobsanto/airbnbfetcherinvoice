import {
  DEMO_ACCOUNTS, DEMO_JOBS, DEMO_INVOICES,
  DEMO_NOTIFICATIONS, DEMO_SCHEDULES,
} from './mockData';
import type { AirbnbAccount, DownloadJob, Invoice, Notification, Schedule } from '@/types';

function sleep(ms = 300) {
  return new Promise((r) => setTimeout(r, ms));
}

// Mutable in-memory state so demo CRUD feels real
let accounts = [...DEMO_ACCOUNTS];
let jobs = [...DEMO_JOBS];
let invoices = [...DEMO_INVOICES];
let notifications = [...DEMO_NOTIFICATIONS];
let schedules = [...DEMO_SCHEDULES];

// ---- Accounts ----
export async function listAccounts(): Promise<AirbnbAccount[]> {
  await sleep();
  return accounts;
}
export async function createAccount(body: { label: string; email: string; password: string }): Promise<AirbnbAccount> {
  await sleep(500);
  const a: AirbnbAccount = {
    id: `acc-${Date.now()}`,
    label: body.label,
    email: body.email,
    status: 'active',
    last_login_at: null,
    last_error: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  accounts = [a, ...accounts];
  return a;
}
export async function updateAccount(id: string, body: Partial<AirbnbAccount>): Promise<AirbnbAccount> {
  await sleep(400);
  accounts = accounts.map(a => a.id === id ? { ...a, ...body, updated_at: new Date().toISOString() } : a);
  return accounts.find(a => a.id === id)!;
}
export async function deleteAccount(id: string): Promise<void> {
  await sleep(400);
  accounts = accounts.filter(a => a.id !== id);
  jobs = jobs.filter(j => j.account_id !== id);
  invoices = invoices.filter(i => i.account_id !== id);
}
export async function testLogin(id: string): Promise<{ message: string; jobId: string }> {
  await sleep(600);
  const jobId = `job-test-${Date.now()}`;
  const account = accounts.find(a => a.id === id);
  const newJob: DownloadJob = {
    id: jobId,
    account_id: id,
    status: 'running',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    invoices_found: 0,
    invoices_downloaded: 0,
    error_message: null,
    started_at: new Date().toISOString(),
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    airbnb_accounts: account ? { id, label: account.label, email: account.email } : undefined,
  };
  jobs = [newJob, ...jobs];
  // Complete after 2 s
  setTimeout(() => {
    jobs = jobs.map(j => j.id === jobId
      ? { ...j, status: 'completed', completed_at: new Date().toISOString() }
      : j
    );
    accounts = accounts.map(a => a.id === id
      ? { ...a, status: 'active', last_login_at: new Date().toISOString(), last_error: null }
      : a
    );
  }, 2000);
  return { message: 'Test login queued', jobId };
}

// ---- Jobs ----
export async function listJobs(params: { status?: string; account_id?: string; limit?: number } = {}): Promise<DownloadJob[]> {
  await sleep();
  let result = [...jobs];
  if (params.status) result = result.filter(j => j.status === params.status);
  if (params.account_id) result = result.filter(j => j.account_id === params.account_id);
  return result.slice(0, params.limit ?? 50);
}
export async function createJob(body: { account_id: string; month: number; year: number }): Promise<DownloadJob> {
  await sleep(500);
  const account = accounts.find(a => a.id === body.account_id);
  const jobId = `job-${Date.now()}`;
  const newJob: DownloadJob = {
    id: jobId,
    account_id: body.account_id,
    status: 'queued',
    month: body.month,
    year: body.year,
    invoices_found: 0,
    invoices_downloaded: 0,
    error_message: null,
    started_at: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    airbnb_accounts: account ? { id: body.account_id, label: account.label, email: account.email } : undefined,
  };
  jobs = [newJob, ...jobs];

  // Simulate job running
  setTimeout(() => {
    jobs = jobs.map(j => j.id === jobId ? { ...j, status: 'running', started_at: new Date().toISOString() } : j);
  }, 1000);
  setTimeout(() => {
    const count = 3 + Math.floor(Math.random() * 5);
    jobs = jobs.map(j => j.id === jobId
      ? { ...j, status: 'completed', invoices_found: count, invoices_downloaded: count, completed_at: new Date().toISOString() }
      : j
    );
  }, 4000);

  return newJob;
}
export async function cancelJob(id: string): Promise<void> {
  await sleep(300);
  jobs = jobs.map(j => j.id === id ? { ...j, status: 'cancelled' } : j);
}

// ---- Invoices ----
export async function listInvoices(params: { account_id?: string; year?: number; month?: number; limit?: number } = {}): Promise<Invoice[]> {
  await sleep();
  let result = [...invoices];
  if (params.account_id) result = result.filter(i => i.account_id === params.account_id);
  if (params.year) result = result.filter(i => i.period_year === params.year);
  if (params.month) result = result.filter(i => i.period_month === params.month);
  return result.slice(0, params.limit ?? 100);
}
export async function getInvoiceDownloadUrl(_id: string): Promise<{ signedUrl: string }> {
  await sleep(300);
  // In demo mode return a publicly accessible sample PDF
  return { signedUrl: 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table-word.pdf' };
}

// ---- Notifications ----
export async function listNotifications(): Promise<Notification[]> {
  await sleep(200);
  return notifications.filter(n => !n.is_read);
}
export async function markAllRead(): Promise<void> {
  await sleep(200);
  notifications = notifications.map(n => ({ ...n, is_read: true }));
}

// ---- Schedules ----
export async function listSchedules(): Promise<Schedule[]> {
  await sleep();
  return schedules;
}
export async function upsertSchedule(body: { account_id: string; enabled: boolean; run_day: number }): Promise<Schedule> {
  await sleep(400);
  const existing = schedules.find(s => s.account_id === body.account_id);
  const account = accounts.find(a => a.id === body.account_id);
  if (existing) {
    schedules = schedules.map(s => s.account_id === body.account_id
      ? { ...s, enabled: body.enabled, run_day: body.run_day, updated_at: new Date().toISOString() }
      : s
    );
    return schedules.find(s => s.account_id === body.account_id)!;
  }
  const s: Schedule = {
    id: `sched-${Date.now()}`,
    account_id: body.account_id,
    enabled: body.enabled,
    run_day: body.run_day,
    last_run_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    airbnb_accounts: account ? { id: body.account_id, label: account.label, email: account.email } : undefined,
    last_job: null,
  };
  schedules = [s, ...schedules];
  return s;
}
export async function deleteSchedule(id: string): Promise<void> {
  await sleep(300);
  schedules = schedules.filter(s => s.id !== id);
}
