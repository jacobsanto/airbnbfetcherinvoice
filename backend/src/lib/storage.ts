import { supabaseAdmin } from './supabaseAdmin';

export async function createSignedDownloadUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from('invoices')
    .createSignedUrl(storagePath, 60);

  if (error || !data) {
    throw new Error(`Failed to create signed URL: ${error?.message}`);
  }
  return data.signedUrl;
}
