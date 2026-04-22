import { supabaseAdmin } from './supabaseAdmin';

export async function uploadPdf(
  buffer: Buffer,
  storagePath: string
): Promise<{ path: string; size: number }> {
  const { error } = await supabaseAdmin.storage
    .from('invoices')
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return { path: storagePath, size: buffer.length };
}

export async function uploadDebugScreenshot(
  buffer: Buffer,
  filename: string
): Promise<void> {
  await supabaseAdmin.storage
    .from('debug')
    .upload(`screenshots/${filename}`, buffer, {
      contentType: 'image/png',
      upsert: true,
    });
}
