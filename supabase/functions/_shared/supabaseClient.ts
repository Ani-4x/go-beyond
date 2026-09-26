import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

/**
 * A Supabase client scoped to whoever called this function, built from the request's own
 * Authorization header. Every query made with it runs under that user's row-level security —
 * there's no service-role key here, so this function can never see another user's data even
 * if a bug asked it to.
 */
export function userClient(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing Authorization header');
  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
}
