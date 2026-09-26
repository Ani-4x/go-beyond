// A thin wrapper around Google's Gemini API (free tier via Google AI Studio — see README for
// how to get a key). Uses the stable `generateContent` endpoint rather than the newer
// Interactions API: as of this writing Google's own docs mark Interactions as beta and
// recommend generateContent for production use.
//
// Docs this was written against:
//   https://ai.google.dev/api/generate-content
//   https://ai.google.dev/gemini-api/docs/embeddings

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta';

/** Fast, free-tier-friendly, and stable. Swap for another `models.generateContent`-compatible
 *  id (e.g. a newer Flash release) if you'd like — see https://ai.google.dev/gemini-api/docs/models. */
const GENERATION_MODEL = 'gemini-2.0-flash';

/** Google's stable text embedding model. */
const EMBEDDING_MODEL = 'gemini-embedding-001';

/** Matches the `embedding` column in the entries table (see migrations/0004_ai_context.sql). */
export const EMBEDDING_DIMENSIONS = 768;

function apiKey(): string {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY is not set for this Edge Function.');
  return key;
}

/**
 * Asks Gemini for a JSON object matching `schema` (a plain JSON Schema object — Gemini's
 * responseSchema dialect). Throws if the call fails or the response can't be parsed as JSON;
 * callers should catch this and fall back to static content, since this is meant to enhance
 * the app, not to be a single point of failure for it.
 */
export async function generateJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${API_ROOT}/models/${GENERATION_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey() },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.9,
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini generateContent failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') {
    throw new Error(`Gemini generateContent returned no text: ${JSON.stringify(data)}`);
  }
  return JSON.parse(text) as T;
}

function l2Normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return norm === 0 ? vec : vec.map((v) => v / norm);
}

/**
 * Embeds a piece of text for retrieval. `taskType` should be RETRIEVAL_DOCUMENT when storing
 * an entry and RETRIEVAL_QUERY when searching for entries similar to some text — Gemini's
 * embeddings are asymmetric, tuned differently for each side of a search.
 *
 * gemini-embedding-001 only guarantees unit-length vectors at its native 3072 dimensions;
 * at any other size (768, here) it must be L2-normalized by the caller before use in cosine
 * similarity, which is what this function does. See the "Note on output_dimensionality" in
 * https://ai.google.dev/gemini-api/docs/embeddings.
 */
export async function embedText(
  text: string,
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY',
): Promise<number[]> {
  const res = await fetch(`${API_ROOT}/models/${EMBEDDING_MODEL}:embedContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey() },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      taskType,
      output_dimensionality: EMBEDDING_DIMENSIONS,
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini embedContent failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values)) {
    throw new Error(`Gemini embedContent returned no vector: ${JSON.stringify(data)}`);
  }
  return l2Normalize(values as number[]);
}
