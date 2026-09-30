// Generates a personalized challenge using both journal context and the exact actions already
// offered. Every generated action is reserved in the database before it is returned.
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { embedText, generateJSON } from '../_shared/gemini.ts';
import { userClient } from '../_shared/supabaseClient.ts';

// Mirrors src/data/content.ts on the client. Keep these two in sync by hand if you change one —
// Deno functions can't import directly from the Expo app's source.
const DIMENSIONS = ['Confidence', 'Social', 'Discipline', 'Learning', 'Experience', 'Openness'];
const LEVEL_INFO: Record<number, { label: string; minutes: string; feel: string }> = {
  1: { label: 'Easy', minutes: '2-5 minutes', feel: 'a very low-friction first step — almost too small to talk yourself out of' },
  2: { label: 'Medium', minutes: '10-20 minutes', feel: 'a real stretch that takes some intention, but is clearly doable in one sitting' },
  3: { label: 'Hard', minutes: '30-60 minutes', feel: 'a genuine challenge that asks something significant of them today' },
};

const SYSTEM_PROMPT = `You write single challenges for Go Beyond, a personal-growth app whose whole idea is that \
someone's comfort zone is a shape that grows one small, concrete action at a time. Every challenge you write must be:
- One sentence, second person, imperative mood (e.g. "Start a conversation with a stranger at a coffee shop.")
- Concrete and doable today, with no special equipment or planning
- Specific rather than generic — name a real micro-action, not a vague intention like "be more confident"
- Free of any preamble, quotation marks, or explanation — just the instruction itself
Return only the JSON the schema asks for, nothing else.`;

interface ChallengeResult {
  text: string;
  minutes: number;
  tips: [string, string, string];
  done: string;
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    text: { type: 'string' },
    minutes: { type: 'integer' },
    tips: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
    done: { type: 'string', description: "Short past-tense journal line, e.g. 'Started a conversation with someone new'." },
  },
  required: ['text', 'minutes', 'tips', 'done'],
};

type PastEntry = { title: string; tag: string; feel: string | null; note: string | null };

function formatHistory(entries: PastEntry[]): string {
  if (entries.length === 0) return '(no history yet — this is one of their first challenges)';
  return entries
    .slice(0, 8)
    .map((e) => `- "${e.title}" (${e.tag}${e.feel ? `, felt ${e.feel.toLowerCase()}` : ''}${e.note ? `: ${e.note}` : ''})`)
    .join('\n');
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function cosineSimilarity(a: number[], b: number[]): number {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { dim, level, pushMe = false, exclude = [] } = await req.json();
    if (typeof dim !== 'number' || dim < 0 || dim >= DIMENSIONS.length) {
      return jsonResponse({ error: 'dim must be 0-5' }, 400);
    }
    if (![1, 2, 3].includes(level)) {
      return jsonResponse({ error: 'level must be 1, 2 or 3' }, 400);
    }
    const dimLabel = DIMENSIONS[dim];
    const info = LEVEL_INFO[level];

    const supabase = userClient(req);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonResponse({ error: 'Sign in to generate a challenge.' }, 401);

    // The client supplies currently displayed actions, including static fallback tasks.
    // All older AI suggestions are fetched from the database, so restarting the app does
    // not clear the exclusion list.
    const currentActions = Array.isArray(exclude)
      ? [...new Set(exclude.filter((text): text is string => typeof text === 'string')
        .map((text) => text.trim()).filter(Boolean))].slice(0, 12).map((text) => text.slice(0, 300))
      : [];

    if (pushMe) {
      const revenueCatSecret = Deno.env.get('REVENUECAT_SECRET_API_KEY');
      if (!revenueCatSecret) return jsonResponse({ error: 'Push Me access is not configured.' }, 503);

      const customerResponse = await fetch(
        `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(user.id)}`,
        { headers: { Authorization: `Bearer ${revenueCatSecret}` } },
      );
      if (!customerResponse.ok) {
        console.error('[generate-challenge] RevenueCat entitlement lookup failed:', customerResponse.status);
        return jsonResponse({ error: 'Could not verify Go Beyond Pro. Try again shortly.' }, 502);
      }
      const customerInfo = await customerResponse.json();
      const proEntitlement = customerInfo?.subscriber?.entitlements?.go_beyond_pro;
      const activeThrough = [proEntitlement?.expires_date, proEntitlement?.grace_period_expires_date]
        .filter((date): date is string => typeof date === 'string')
        .map((date) => Date.parse(date));
      const hasNoExpiry = Boolean(proEntitlement) && activeThrough.length === 0;
      const isActive = hasNoExpiry || activeThrough.some((date) => Number.isFinite(date) && date > Date.now());
      if (!proEntitlement || !isActive) {
        return jsonResponse({ error: 'Push Me is a Go Beyond Pro feature.' }, 403);
      }
    }

    // Retrieval: what has this person already done, generally and specifically in this
    // dimension? Two signals combined — semantic similarity and plain recency — since either
    // alone can miss something the other would have caught.
    const queryEmbedding = await embedText(`${dimLabel} personal growth challenge`, 'RETRIEVAL_QUERY');
    const [{ data: similar }, { data: recent }, { data: generated, error: historyError }] = await Promise.all([
      supabase.rpc('match_entries', { query_embedding: queryEmbedding, match_count: 6 }),
      supabase.from('entries').select('title, tag, feel, note').order('created_at', { ascending: false }).limit(5),
      supabase.from('generated_challenges').select('text').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(30),
    ]);
    if (historyError) throw historyError;

    const seen = new Set<string>();
    const history: PastEntry[] = [];
    for (const e of [...(similar ?? []), ...(recent ?? [])]) {
      const key = `${e.title}|${e.tag}`;
      if (seen.has(key)) continue;
      seen.add(key);
      history.push(e);
    }

    const pushGuidance = pushMe
      ? "\nPUSH ME MODE: Make this a meaningful step beyond the user's usual challenge, while staying safe, legal, and achievable today. Do not suggest dangerous physical stunts, financial risk, illegal activity, or pressuring another person. At level 3, make it a more thoughtful or courageous stretch, not a risky one.\n"
      : '';
    const offeredActions = [...new Set([...(generated ?? []).map((row) => row.text), ...currentActions])];
    const currentEmbeddings = await Promise.all(
      currentActions.map((text) => embedText(text, 'RETRIEVAL_DOCUMENT')),
    );

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const userPrompt = `Dimension: ${dimLabel}
Target difficulty: ${info.label} — ${info.feel}. Roughly ${info.minutes}.

${pushGuidance}
Previously completed actions (do not repeat):
${formatHistory(history)}

Actions already offered or visible today (choose a different core action, not a paraphrase or an extra step of one):
${offeredActions.length ? offeredActions.slice(0, 42).map((text) => `- ${text}`).join('\n') : '(none yet)'}

Write one new ${info.label.toLowerCase()}-difficulty ${dimLabel} challenge with a genuinely different action, plus three short tips and a short past-tense journal line.`;

      const result = await generateJSON<ChallengeResult>(SYSTEM_PROMPT, userPrompt, RESPONSE_SCHEMA);

      if (typeof result.text !== 'string' || !Array.isArray(result.tips) || result.tips.length !== 3) {
        throw new Error('Malformed generation result');
      }
      const text = result.text.trim();
      if (text.length < 10) throw new Error('Malformed generation result');
      const embedding = await embedText(text, 'RETRIEVAL_DOCUMENT');
      const repeatsVisibleAction = currentActions.some((action, index) =>
        normalize(action) === normalize(text) || cosineSimilarity(embedding, currentEmbeddings[index]) >= 0.78);
      if (!repeatsVisibleAction) {
        const { data: reserved, error: reserveError } = await supabase.rpc('reserve_generated_challenge', {
          challenge_text: text,
          challenge_embedding: embedding,
        });
        if (reserveError) throw reserveError;
        if (reserved) {
          return jsonResponse({
            text,
            minutes: Number.isFinite(result.minutes) ? Math.round(result.minutes) : 10,
            tips: result.tips.slice(0, 3),
            done: (result.done ?? `Completed a ${dimLabel.toLowerCase()} challenge`).trim(),
          });
        }
      }
      offeredActions.unshift(text);
    }

    return jsonResponse({ error: 'Could not find a new challenge yet. Please try again.' }, 409);
  } catch (e) {
    console.error('[generate-challenge]', e);
    return jsonResponse({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
