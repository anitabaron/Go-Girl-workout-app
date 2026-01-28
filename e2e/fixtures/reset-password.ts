import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env.test') });

/**
 * Generate a password reset (recovery) link for E2E tests without relying on email.
 * Uses Supabase Admin API - requires SUPABASE_SERVICE_ROLE_KEY in .env.test.
 *
 * @param email - User email to generate recovery link for
 * @param redirectTo - URL to redirect after clicking link (default: auth/callback so code is exchanged, then app redirects to reset-password/confirm)
 * @returns The recovery link URL, or null if service role is not configured
 */
export async function generatePasswordResetLink(
  email: string,
  redirectTo: string = 'http://localhost:3000/auth/callback?type=recovery',
): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data,
    error,
  } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  });

  if (error || !data?.properties?.action_link) {
    return null;
  }

  return data.properties.action_link as string;
}
