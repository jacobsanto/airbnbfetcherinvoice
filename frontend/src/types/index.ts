export interface AirbnbAccount {
  id: string;
  label: string;
  email: string;
  status: 'active' | 'inactive' | 'error' | 'needs_2fa';
  last_login_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export type JobStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'awaiting_2fa'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface DownloadJob {
  id: string;
  account_id: string;
  status: JobStatus;
  month: number;
  year: number;
  invoices_found: number;
  invoices_downloaded: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  airbnb_accounts?: { id: string; label: string; email: string };
}

export interface Invoice {
  id: string;
  job_id: string;
  account_id: string;
  invoice_number: string | null;
  invoice_type: string | null;
  period_month: number;
  period_year: number;
  amount: number | null;
  currency: string | null;
  storage_path: string | null;
  file_size_bytes: number | null;
  downloaded_at: string | null;
  status: 'pending' | 'downloaded' | 'failed';
  created_at: string;
  airbnb_accounts?: { id: string; label: string; email: string };
}

export interface Notification {
  id: string;
  job_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
