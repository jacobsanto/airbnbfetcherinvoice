import { supabaseAdmin } from '../lib/supabaseAdmin';
import { encrypt, decrypt } from '../lib/crypto';
import { AccountCreateBody, AccountUpdateBody } from '../types/api';

export async function listAccounts(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('airbnb_accounts')
    .select('id, label, email, status, last_login_at, last_error, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAccount(userId: string, accountId: string) {
  const { data, error } = await supabaseAdmin
    .from('airbnb_accounts')
    .select('id, label, email, status, last_login_at, last_error, created_at, updated_at')
    .eq('user_id', userId)
    .eq('id', accountId)
    .single();

  if (error) throw error;
  return data;
}

export async function createAccount(userId: string, body: AccountCreateBody) {
  const { encrypted, iv } = encrypt(body.password);

  const { data, error } = await supabaseAdmin
    .from('airbnb_accounts')
    .insert({
      user_id: userId,
      label: body.label,
      email: body.email,
      encrypted_password: encrypted,
      encryption_iv: iv,
    })
    .select('id, label, email, status, created_at')
    .single();

  if (error) throw error;
  return data;
}

export async function updateAccount(userId: string, accountId: string, body: AccountUpdateBody) {
  const updates: Record<string, unknown> = {};

  if (body.label !== undefined) updates.label = body.label;
  if (body.email !== undefined) updates.email = body.email;
  if (body.password !== undefined) {
    const { encrypted, iv } = encrypt(body.password);
    updates.encrypted_password = encrypted;
    updates.encryption_iv = iv;
  }

  const { data, error } = await supabaseAdmin
    .from('airbnb_accounts')
    .update(updates)
    .eq('user_id', userId)
    .eq('id', accountId)
    .select('id, label, email, status, updated_at')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAccount(userId: string, accountId: string) {
  const { error } = await supabaseAdmin
    .from('airbnb_accounts')
    .delete()
    .eq('user_id', userId)
    .eq('id', accountId);

  if (error) throw error;
}

export async function getAccountWithCredentials(accountId: string) {
  const { data, error } = await supabaseAdmin
    .from('airbnb_accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (error) throw error;

  return {
    ...data,
    password: decrypt(data.encrypted_password, data.encryption_iv),
  };
}
