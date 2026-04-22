import { supabaseAdmin } from '../lib/supabaseAdmin';
import { createSignedDownloadUrl } from '../lib/storage';
import { InvoiceListQuery } from '../types/api';

export async function listInvoices(userId: string, query: InvoiceListQuery) {
  const limit = Math.min(query.limit ?? 20, 100);
  const offset = query.offset ?? 0;

  let q = supabaseAdmin
    .from('invoices')
    .select(`
      id, invoice_number, invoice_type, period_month, period_year,
      amount, currency, storage_path, file_size_bytes, downloaded_at, status,
      created_at, airbnb_accounts(id, label, email)
    `)
    .eq('user_id', userId)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })
    .range(offset, offset + limit - 1);

  if (query.account_id) q = q.eq('account_id', query.account_id);
  if (query.year) q = q.eq('period_year', query.year);
  if (query.month) q = q.eq('period_month', query.month);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getInvoice(userId: string, invoiceId: string) {
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('*, airbnb_accounts(id, label, email)')
    .eq('user_id', userId)
    .eq('id', invoiceId)
    .single();

  if (error) throw error;
  return data;
}

export async function getInvoiceDownloadUrl(userId: string, invoiceId: string) {
  const invoice = await getInvoice(userId, invoiceId);

  if (!invoice.storage_path) {
    throw Object.assign(new Error('Invoice PDF not yet downloaded'), { statusCode: 404 });
  }

  const signedUrl = await createSignedDownloadUrl(invoice.storage_path);
  return { signedUrl, expiresIn: 60 };
}
