import { supabaseAdmin } from '../lib/supabaseAdmin';
import { invoiceQueue } from '../lib/queue';

export async function listSchedules(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('scheduled_jobs')
    .select(`
      id, enabled, run_day, last_run_at, created_at, updated_at,
      airbnb_accounts(id, label, email),
      last_job:last_job_id(id, status, invoices_downloaded)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function upsertSchedule(
  userId: string,
  accountId: string,
  enabled: boolean,
  runDay: number
) {
  const { data: account } = await supabaseAdmin
    .from('airbnb_accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('id', accountId)
    .single();

  if (!account) {
    throw Object.assign(new Error('Account not found'), { statusCode: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from('scheduled_jobs')
    .upsert(
      { user_id: userId, account_id: accountId, enabled, run_day: runDay },
      { onConflict: 'user_id,account_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSchedule(userId: string, scheduleId: string) {
  const { error } = await supabaseAdmin
    .from('scheduled_jobs')
    .delete()
    .eq('user_id', userId)
    .eq('id', scheduleId);

  if (error) throw error;
}

export async function runDueSchedules(): Promise<void> {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const { data: due, error } = await supabaseAdmin
    .from('scheduled_jobs')
    .select('id, user_id, account_id')
    .eq('enabled', true)
    .eq('run_day', dayOfMonth)
    .or(`last_run_at.is.null,last_run_at.lt.${new Date(year, month - 1, 1).toISOString()}`);

  if (error || !due?.length) return;

  for (const schedule of due) {
    try {
      const { data: job, error: jobErr } = await supabaseAdmin
        .from('download_jobs')
        .insert({
          user_id: schedule.user_id,
          account_id: schedule.account_id,
          month,
          year,
          status: 'queued',
        })
        .select()
        .single();

      if (jobErr || !job) continue;

      const bullJob = await invoiceQueue.add(
        'fetch-invoices',
        { jobId: job.id, accountId: schedule.account_id, userId: schedule.user_id, month, year },
        { jobId: `invoice-${job.id}` }
      );

      await supabaseAdmin
        .from('download_jobs')
        .update({ bullmq_job_id: bullJob.id })
        .eq('id', job.id);

      await supabaseAdmin
        .from('scheduled_jobs')
        .update({ last_run_at: new Date().toISOString(), last_job_id: job.id })
        .eq('id', schedule.id);
    } catch (err) {
      console.error(`Failed to trigger scheduled job for ${schedule.id}:`, err);
    }
  }
}
