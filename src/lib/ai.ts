import type { DimIndex, Level } from '../data/content';
import { supabase } from './supabase';

export type GeneratedChallenge = {
  text: string;
  minutes: number;
  tips: [string, string, string];
  done: string;
};

/**
 * Asks the `generate-challenge` Edge Function for a fresh, personalized challenge for this
 * dimension and level — it looks at the caller's own journal (via vector search) so it doesn't
 * repeat what they've already done. Returns null on any failure (offline, no key configured,
 * a bad response, ...) so callers can silently keep the static fallback from `content.ts`
 * instead — this is an enhancement, never something the app depends on to function.
 */
export async function generateChallenge(dim: DimIndex, level: Level): Promise<GeneratedChallenge | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-challenge', { body: { dim, level } });
    if (error || !data || typeof data.text !== 'string' || !Array.isArray(data.tips) || data.tips.length !== 3) {
      return null;
    }
    return data as GeneratedChallenge;
  } catch {
    return null;
  }
}

/**
 * Fire-and-forget: asks the `embed-entry` Edge Function to compute and store a vector
 * embedding for a journal entry, so future challenge generation can find it. Never awaited by
 * callers and never surfaces an error — a missed embedding just means slightly weaker
 * retrieval for that one entry later, not a broken save.
 */
export function embedEntry(entryId: string): void {
  supabase.functions.invoke('embed-entry', { body: { entryId } }).catch(() => {});
}
