// Generates a fresh, personalized challenge for one dimension + level, using the caller's own
// journal (via vector search + recency) so it doesn't repeat what they've already done. Falls
// back to nothing (the client keeps its static library) on any failure — this is an
// enhancement, never a dependency the app can't run without.
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

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { dim, level } = await req.json();
    if (typeof dim !== 'number' || dim < 0 || dim >= DIMENSIONS.length) {
      return jsonResponse({ error: 'dim must be 0-5' }, 400);
    }
    if (![1, 2, 3].includes(level)) {
      return jsonResponse({ error: 'level must be 1, 2 or 3' }, 400);
    }
    const dimLabel = DIMENSIONS[dim];
    const info = LEVEL_INFO[level];

    const supabase = userClient(req);

    // Retrieval: what has this person already done, generally and specifically in this
    // dimension? Two signals combined — semantic similarity and plain recency — since either
    // alone can miss something the other would have caught.
    const queryEmbedding = await embedText(`${dimLabel} personal growth challenge`, 'RETRIEVAL_QUERY');
    const [{ data: similar }, { data: recent }] = await Promise.all([
      supabase.rpc('match_entries', { query_embedding: queryEmbedding, match_count: 6 }),
      supabase.from('entries').select('title, tag, feel, note').order('created_at', { ascending: false }).limit(5),
    ]);

    const seen = new Set<string>();
    const history: PastEntry[] = [];
    for (const e of [...(similar ?? []), ...(recent ?? [])]) {
      const key = `${e.title}|${e.tag}`;
      if (seen.has(key)) continue;
      seen.add(key);
      history.push(e);
    }

    const userPrompt = `Dimension: ${dimLabel}
Target difficulty: ${info.label} — ${info.feel}. Roughly ${info.minutes}.

Things this person has already done (do not repeat these themes):
${formatHistory(history)}

Write one new ${info.label.toLowerCase()}-difficulty ${dimLabel} challenge for them, plus three short tips for actually doing it, plus a short past-tense line describing having done it (for their journal).`;

    const result = await generateJSON<ChallengeResult>(SYSTEM_PROMPT, userPrompt, RESPONSE_SCHEMA);

    if (typeof result.text !== 'string' || !Array.isArray(result.tips) || result.tips.length !== 3) {
      throw new Error('Malformed generation result');
    }

    return jsonResponse({
      text: result.text.trim(),
      minutes: Number.isFinite(result.minutes) ? Math.round(result.minutes) : 10,
      tips: result.tips.slice(0, 3),
      done: (result.done ?? `Completed a ${dimLabel.toLowerCase()} challenge`).trim(),
    });
  } catch (e) {
    console.error('[generate-challenge]', e);
    return jsonResponse({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
