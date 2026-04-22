import { supabaseAdmin } from '../lib/supabaseAdmin';

type JobStatus = 'pending' | 'queued' | 'running' | 'awaiting_2fa' | 'completed' | 'failed' | 'cancelled';

export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  extra?: {
    error_message?: string;
    invoices_found?: number;
    invoices_downloaded?: number;
    started_at?: string;
    completed_at?: string;
  }
): Promise<void> {
  await supabaseAdmin
    .from('download_jobs')
    .update({ status, ...extra })
    .eq('id', jobId);
}

export async function createNotification(
  userId: string,
  jobId: string | null,
  type: string,
  title: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    job_id: jobId,
    type,
    title,
    message,
    metadata,
  });
}

export async function upsertInvoiceRecord(params: {
  jobId: string;
  accountId: string;
  userId: string;
  invoiceNumber: string | null;
  invoiceType: string | null;
  periodMonth: number;
  periodYear: number;
  amount: number | null;
  currency: string | null;
  airbnbUrl: string | null;
  storagePath?: string;
  fileSizeBytes?: number;
}): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .insert({
      job_id: params.jobId,
      account_id: params.accountId,
      user_id: params.userId,
      invoice_number: params.invoiceNumber,
      invoice_type: params.invoiceType,
      period_month: params.periodMonth,
      period_year: params.periodYear,
      amount: params.amount,
      currency: params.currency,
      airbnb_url: params.airbnbUrl,
      storage_path: params.storagePath ?? null,
      file_size_bytes: params.fileSizeBytes ?? null,
      downloaded_at: params.storagePath ? new Date().toISOString() : null,
      status: params.storagePath ? 'downloaded' : 'pending',
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function markInvoiceDownloaded(
  invoiceId: string,
  storagePath: string,
  fileSizeBytes: number
): Promise<void> {
  await supabaseAdmin
    .from('invoices')
    .update({
      storage_path: storagePath,
      file_size_bytes: fileSizeBytes,
      downloaded_at: new Date().toISOString(),
      status: 'downloaded',
    })
    .eq('id', invoiceId);
}
