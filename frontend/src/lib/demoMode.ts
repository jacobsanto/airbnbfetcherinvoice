import { User } from '@supabase/supabase-js';
import { DEMO_USER } from './mockData';

export const DEMO_MODE =
  !import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL === 'https://your-project.supabase.co';

// Minimal stub that satisfies the User type for demo mode
export const DEMO_USER_STUB = {
  id: DEMO_USER.id,
  email: DEMO_USER.email,
  created_at: DEMO_USER.created_at,
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  role: 'authenticated',
} as unknown as User;
