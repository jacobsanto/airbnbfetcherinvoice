import { supabaseAdmin } from '../lib/supabaseAdmin';
import { invoiceQueue } from '../lib/queue';
import { JobCreateBody, JobListQuery } from '../types/api';

export async function listJobs(userId: string, query: JobListQuery) {
  const limit = Math.min(query.limit ?? 20, 100);
  const offset = query.offset ?? 0;

  let q = supabaseAdmin
    .from('download_jobs')
    .select(`
      id, status, month, year, invoices_found, invoices_downloaded,
      error_message, started_at, completed_at, created_at, updated_at,
      airbnb_accounts(id, label, email)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (query.status) q = q.eq('status', query.status);
  if (query.account_id) q = q.eq('account_id', query.account_id);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getJob(userId: string, jobId: string) {
  const { data, error } = await supabaseAdmin
    .from('download_jobs')
    .select(`
      *,
      airbnb_accounts(id, label, email)
    `)
    .eq('user_id', userId)
    .eq('id', jobId)
    .single();

  if (error) throw error;
  return data;
}

export async function createJob(userId: string, body: JobCreateBody) {
  // Verify account belongs to user
  const { data: account, error: accErr } = await supabaseAdmin
    .from('airbnb_accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('id', body.account_id)
    .single();

  if (accErr || !account) {
    throw Object.assign(new Error('Account not found'), { statusCode: 404 });
  }

  const { data: job, error } = await supabaseAdmin
    .from('download_jobs')
    .insert({
      user_id: userId,
      account_id: body.account_id,
      month: body.month,
      year: body.year,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;

  // Enqueue the job
  const bullJob = await invoiceQueue.add(
    'fetch-invoices',
    { jobId: job.id, accountId: body.account_id, userId, month: body.month, year: body.year },
    { jobId: `invoice-${job.id}` }
  );

  await supabaseAdmin
    .from('download_jobs')
    .update({ status: 'queued', bullmq_job_id: bullJob.id })
    .eq('id', job.id);

  return { ...job, status: 'queued', bullmq_job_id: bullJob.id };
}

export async function createTestJob(userId: string, accountId: string) {
  const { data: account, error: accErr } = await supabaseAdmin
    .from('airbnb_accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('id', accountId)
    .single();

  if (accErr || !account) {
    throw Object.assign(new Error('Account not found'), { statusCode: 404 });
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const { data: job, error } = await supabaseAdmin
    .from('download_jobs')
    .insert({ user_id: userId, account_id: accountId, month, year, status: 'queued' })
    .select()
    .single();

  if (error) throw error;

  const bullJob = await invoiceQueue.add(
    'test-login',
    { jobId: job.id, accountId, userId, month, year, test: true },
    { jobId: `test-${job.id}` }
  );

  await supabaseAdmin
    .from('download_jobs')
    .update({ bullmq_job_id: bullJob.id })
    .eq('id', job.id);

  return { ...job, status: 'queued', bullmq_job_id: bullJob.id };
}

export async function cancelJob(userId: string, jobId: string) {
  const { data: job, error } = await supabaseAdmin
    .from('download_jobs')
    .select('status, bullmq_job_id')
    .eq('user_id', userId)
    .eq('id', jobId)
    .single();

  if (error || !job) {
    throw Object.assign(new Error('Job not found'), { statusCode: 404 });
  }

  if (!['pending', 'queued'].includes(job.status)) {
    throw Object.assign(new Error('Only pending or queued jobs can be cancelled'), { statusCode: 400 });
  }

  if (job.bullmq_job_id) {
    const bullJob = await invoiceQueue.getJob(job.bullmq_job_id);
    await bullJob?.remove();
  }

  await supabaseAdmin
    .from('download_jobs')
    .update({ status: 'cancelled' })
    .eq('id', jobId);
}
