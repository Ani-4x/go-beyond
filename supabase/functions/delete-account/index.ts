import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { userClient } from '../_shared/supabaseClient.ts';

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  try {
    const caller = userClient(req);
    const { data: { user }, error: authError } = await caller.auth.getUser();
    if (authError || !user) return jsonResponse({ error: 'Sign in again before deleting your account.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[delete-account] Supabase admin credentials are not configured.');
      return jsonResponse({ error: 'Account deletion is temporarily unavailable. Please try again later.' }, 503);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('[delete-account] user deletion failed:', deleteError.message);
      return jsonResponse({ error: 'We could not delete your account. Please try again.' }, 500);
    }

    // public.profiles and public.entries reference auth.users with ON DELETE CASCADE.
    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error('[delete-account] request failed:', error instanceof Error ? error.message : error);
    return jsonResponse({ error: 'We could not delete your account. Please try again.' }, 500);
  }
});
