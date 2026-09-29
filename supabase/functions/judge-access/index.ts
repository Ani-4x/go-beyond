import { corsHeaders, handleOptions, jsonResponse } from '../_shared/cors.ts';
import { userClient } from '../_shared/supabaseClient.ts';

const allowedDurations = new Set(['three_month', 'six_month', 'yearly']);

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  const expectedCode = Deno.env.get('JUDGE_ACCESS_CODE');
  const revenueCatSecret = Deno.env.get('REVENUECAT_SECRET_API_KEY');
  if (!expectedCode || !revenueCatSecret) {
    return jsonResponse({ error: 'Judge access is not configured.' }, 503);
  }

  try {
    const supabase = userClient(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonResponse({ error: 'Sign in to redeem judge access.' }, 401);

    const body = await req.json().catch(() => ({}));
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!code || code.length > 128 || code !== expectedCode) {
      return jsonResponse({ error: 'That judge code is not valid.' }, 400);
    }

    const requestedDuration = Deno.env.get('JUDGE_ACCESS_DURATION') ?? 'six_month';
    const duration = allowedDurations.has(requestedDuration) ? requestedDuration : 'six_month';
    const url = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(user.id)}/entitlements/go_beyond_pro/promotional`;
    const grant = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${revenueCatSecret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration }),
    });
    if (!grant.ok) {
      console.error('[judge-access] RevenueCat grant failed:', grant.status, await grant.text());
      return jsonResponse({ error: 'Could not activate judge access. Please try again.' }, 502);
    }

    return new Response(JSON.stringify({ activated: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[judge-access] request failed:', error instanceof Error ? error.message : error);
    return jsonResponse({ error: 'Could not activate judge access. Please try again.' }, 500);
  }
});
