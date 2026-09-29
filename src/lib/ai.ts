import type { DimIndex, Level } from '../data/content';
import { supabase } from './supabase';

export type GeneratedChallenge = {
  text: string;
  minutes: number;
  tips: [string, string, string];
  done: string;
};

async function pushMeFailure(error: unknown): Promise<Error> {
  // Supabase wraps non-2xx Edge Function responses in an error whose `context` is
  // the original Response. Read its JSON body so setup/entitlement failures don't
  // all look like network failures to the user.
  const context = (error as { context?: { clone?: () => Response } } | null)?.context;
  if (context && typeof context.clone === 'function') {
    try {
      const body = await context.clone().json() as { error?: unknown };
      if (typeof body.error === 'string' && body.error.trim()) {
        return new Error(__DEV__ ? body.error : 'Push Me could not be generated. Please try again shortly.');
      }
    } catch {
      // Fall through to the SDK/network error below.
    }
  }

  const message = error instanceof Error ? error.message : '';
  return new Error(__DEV__ && message
    ? `Push Me request failed: ${message}`
    : 'Could not reach the Push Me service. Check your connection and try again.');
}

/**
 * Asks the `generate-challenge` Edge Function for a fresh, personalized challenge for this
 * dimension and level — it looks at the caller's own journal (via vector search) so it doesn't
 * repeat what they've already done. Returns null on any failure (offline, no key configured,
 * a bad response, ...) so callers can silently keep the static fallback from `content.ts`
 * instead — this is an enhancement, never something the app depends on to function.
 */
export async function generateChallenge(
  dim: DimIndex,
  level: Level,
  options: { pushMe?: boolean; exclude?: string[] } = {},
): Promise<GeneratedChallenge | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-challenge', {
      body: { dim, level, pushMe: options.pushMe ?? false, exclude: options.exclude ?? [] },
    });
    if (error || !data || typeof data.text !== 'string' || !Array.isArray(data.tips) || data.tips.length !== 3) {
      if (options.pushMe) throw error ?? new Error('The Push Me response was incomplete.');
      return null;
    }
    return data as GeneratedChallenge;
  } catch (error) {
    if (options.pushMe) throw await pushMeFailure(error);
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
