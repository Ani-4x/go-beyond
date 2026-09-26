// Computes and stores an embedding for one journal entry, right after it's created, so future
// challenge generation can find it via vector search. Best-effort: the client fires this and
// doesn't wait on it, so a failure here just means slightly weaker retrieval later, never a
// broken save.
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { embedText } from '../_shared/gemini.ts';
import { userClient } from '../_shared/supabaseClient.ts';

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { entryId } = await req.json();
    if (typeof entryId !== 'string') return jsonResponse({ error: 'entryId is required' }, 400);

    const supabase = userClient(req);
    // RLS scopes this to the caller's own entries, so there's no risk of embedding — or even
    // seeing — anyone else's journal.
    const { data: entry, error } = await supabase
      .from('entries')
      .select('title, tag, note')
      .eq('id', entryId)
      .single();
    if (error || !entry) return jsonResponse({ error: error?.message ?? 'Entry not found' }, 404);

    const text = [entry.title, entry.tag, entry.note].filter(Boolean).join('. ');
    const embedding = await embedText(text, 'RETRIEVAL_DOCUMENT');

    const { error: updateError } = await supabase.from('entries').update({ embedding }).eq('id', entryId);
    if (updateError) return jsonResponse({ error: updateError.message }, 500);

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error('[embed-entry]', e);
    return jsonResponse({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
