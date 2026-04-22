import { supabaseAdmin } from '../lib/supabaseAdmin';

export async function listNotifications(userId: string, unreadOnly: boolean) {
  let q = supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (unreadOnly) q = q.eq('is_read', false);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function markRead(userId: string, notificationId: string) {
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('id', notificationId);

  if (error) throw error;
}

export async function markAllRead(userId: string) {
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
}
