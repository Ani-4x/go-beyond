// Edge Functions run on their own origin, so the app's requests are cross-origin as far as a
// browser-based caller would be concerned. React Native's fetch doesn't enforce CORS, but the
// OPTIONS preflight handling here is cheap, standard, and keeps this callable from a web build
// or from the Supabase dashboard's "Invoke" tester too.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function handleOptions(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return null;
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
