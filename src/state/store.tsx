import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import * as Crypto from 'expo-crypto';
import {
  CHALLENGES,
  DIMENSIONS,
  DimIndex,
  GAIN,
  Level,
  QUESTIONS,
  TIPS,
  XP,
} from '../data/content';
import { dayKey, yesterdayKey } from '../lib/date';
import { EntryRow, ProfileRow, supabase } from '../lib/supabase';
import { useAuth } from './auth';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type Entry = {
  id: string;
  type: 'challenge' | 'moment';
  title: string;
  /** Dimension name for challenges, category for moments. */
  tag: string;
  feel?: string;
  ts: number;
};

export type TodayChallenge = {
  date: string;
  dim: DimIndex;
  /** The level the app picked from your edge. */
  level: Level;
  /** "Make it smaller" drops one level. */
  shrunk: boolean;
  done: boolean;
};

export type Persisted = {
  onboarded: boolean;
  /** Comfort zone per dimension, 0..1. */
  zone: number[];
  xp: number;
  streak: number;
  lastCompleted: string | null;
  completedDays: string[];
  today: TodayChallenge | null;
  entries: Entry[];
};

export type State = Persisted & { ready: boolean };

const DEFAULT_ZONE = [0.3, 0.3, 0.3, 0.3, 0.3, 0.3];

const EMPTY: Persisted = {
  onboarded: false,
  zone: DEFAULT_ZONE,
  xp: 0,
  streak: 0,
  lastCompleted: null,
  completedDays: [],
  today: null,
  entries: [],
};

/* ------------------------------------------------------------------ */
/* Pure logic                                                          */
/* ------------------------------------------------------------------ */

/** Turns baseline answers (option index 0..3 per question) into a starting zone. */
export function scoreBaseline(answers: number[]): number[] {
  const sum = [0, 0, 0, 0, 0, 0];
  const count = [0, 0, 0, 0, 0, 0];
  QUESTIONS.forEach((q, i) => {
    if (answers[i] !== undefined) {
      sum[q.dim] += answers[i];
      count[q.dim] += 1;
    }
  });
  return sum.map((s, d) => (count[d] ? 0.18 + 0.54 * (s / count[d] / 3) : 0.3));
}

export const levelFor = (zoneValue: number): Level => (zoneValue < 0.2 ? 1 : zoneValue < 0.5 ? 2 : 3);

export const effectiveLevel = (t: TodayChallenge): Level =>
  (t.shrunk ? Math.max(1, t.level - 1) : t.level) as Level;

export const weakestDim = (zone: number[], avoid?: number): DimIndex => {
  const order = zone.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const pick = order.find((o) => o.i !== avoid) ?? order[0];
  return pick.i as DimIndex;
};

export function previewCompletion(state: Pick<State, 'zone' | 'today'>) {
  const t = state.today;
  if (!t || t.done) return null;
  const level = effectiveLevel(t);
  const to = state.zone.map((v, i) => (i === t.dim ? Math.min(1, v + GAIN[level]) : v));
  return { dim: t.dim, level, from: state.zone, to, xpGain: XP[level] };
}

const computeCompletedDays = (entries: Entry[]): string[] => [
  ...new Set(entries.filter((e) => e.type === 'challenge').map((e) => dayKey(e.ts))),
];

function fromRows(profile: ProfileRow | null, entryRows: EntryRow[]): Persisted {
  const entries: Entry[] = entryRows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    tag: r.tag,
    feel: r.feel ?? undefined,
    ts: new Date(r.created_at).getTime(),
  }));
  return {
    onboarded: profile?.onboarded ?? false,
    zone: profile?.zone && profile.zone.length === 6 ? profile.zone : DEFAULT_ZONE,
    xp: profile?.xp ?? 0,
    streak: profile?.streak ?? 0,
    lastCompleted: profile?.last_completed ?? null,
    completedDays: computeCompletedDays(entries),
    today: (profile?.today as TodayChallenge | null) ?? null,
    entries,
  };
}

/* ------------------------------------------------------------------ */
/* Reducer                                                             */
/* ------------------------------------------------------------------ */

type Action =
  | { type: 'hydrate'; data: Persisted }
  | { type: 'signedOut' }
  | { type: 'finishBaseline'; zone: number[] }
  | { type: 'completeOnboarding' }
  | { type: 'ensureToday'; now: number }
  | { type: 'setShrunk'; shrunk: boolean }
  | { type: 'complete'; id: string; feel?: string; now: number }
  | { type: 'addMoment'; id: string; title: string; tag: string; feel?: string; now: number }
  | { type: 'reset' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return { ...action.data, ready: true };

    case 'signedOut':
      return { ...EMPTY, ready: false };

    case 'finishBaseline':
      return { ...state, zone: action.zone };

    case 'completeOnboarding':
      return { ...state, onboarded: true };

    case 'ensureToday': {
      const key = dayKey(action.now);
      if (state.today && state.today.date === key) return state;
      const dim = weakestDim(state.zone, state.today?.dim);
      return {
        ...state,
        today: { date: key, dim, level: levelFor(state.zone[dim]), shrunk: false, done: false },
      };
    }

    case 'setShrunk':
      return state.today ? { ...state, today: { ...state.today, shrunk: action.shrunk } } : state;

    case 'complete': {
      const t = state.today;
      if (!t || t.done) return state;
      const level = effectiveLevel(t);
      const key = dayKey(action.now);
      const zone = state.zone.map((v, i) => (i === t.dim ? Math.min(1, v + GAIN[level]) : v));
      const streak =
        state.lastCompleted === key
          ? state.streak
          : state.lastCompleted === yesterdayKey(action.now)
            ? state.streak + 1
            : 1;
      const entry: Entry = {
        id: action.id,
        type: 'challenge',
        title: CHALLENGES[t.dim][level].done,
        tag: DIMENSIONS[t.dim],
        feel: action.feel,
        ts: action.now,
      };
      return {
        ...state,
        zone,
        xp: state.xp + XP[level],
        streak,
        lastCompleted: key,
        completedDays: state.completedDays.includes(key) ? state.completedDays : [...state.completedDays, key],
        today: { ...t, done: true },
        entries: [entry, ...state.entries],
      };
    }

    case 'addMoment': {
      const entry: Entry = {
        id: action.id,
        type: 'moment',
        title: action.title,
        tag: action.tag,
        feel: action.feel,
        ts: action.now,
      };
      return { ...state, entries: [entry, ...state.entries] };
    }

    case 'reset':
      return { ...EMPTY, ready: true };
  }
}

/* ------------------------------------------------------------------ */
/* Supabase sync                                                       */
/* ------------------------------------------------------------------ */

/** Retries a fire-and-forget write a few times with backoff, then gives up quietly. */
function withRetry(
  label: string,
  attempt: () => PromiseLike<{ error: { message: string } | null }>,
  tries = 3,
  delay = 2000,
) {
  attempt().then(({ error }) => {
    if (!error) return;
    if (tries <= 1) {
      console.warn(`[go-beyond] ${label} failed permanently:`, error.message);
      return;
    }
    setTimeout(() => withRetry(label, attempt, tries - 1, delay * 2), delay);
  });
}

async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (data) return data as ProfileRow;

  // The database trigger normally creates this row at sign-up. If it hasn't landed yet
  // (a brand-new account, checked a beat too soon), create it here so the app isn't stuck.
  const fallback = { id: userId, zone: DEFAULT_ZONE, xp: 0, streak: 0, last_completed: null, today: null, onboarded: false };
  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .upsert(fallback, { onConflict: 'id' })
    .select('*')
    .single();
  if (insertError) throw insertError;
  return inserted as ProfileRow;
}

async function fetchEntries(userId: string): Promise<EntryRow[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as EntryRow[];
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

type Store = {
  state: State;
  finishBaseline: (answers: number[]) => void;
  completeOnboarding: () => void;
  ensureToday: () => void;
  setShrunk: (shrunk: boolean) => void;
  complete: (feel?: string) => void;
  addMoment: (m: { title: string; tag: string; feel?: string }) => void;
  resetAll: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const [state, dispatch] = useReducer(reducer, { ...EMPTY, ready: false });

  // IDs already written to (or read from) Supabase, so the sync effect below never re-inserts them.
  const syncedEntryIds = useRef<Set<string>>(new Set());
  // Guards against a slow fetch from a previous user landing after a new one has signed in.
  const requestId = useRef(0);

  // Fetch this user's data on sign-in, and clear local state on sign-out.
  useEffect(() => {
    if (!userId) {
      syncedEntryIds.current = new Set();
      dispatch({ type: 'signedOut' });
      return;
    }
    const id = ++requestId.current;
    (async () => {
      try {
        const [profile, entryRows] = await Promise.all([fetchProfile(userId), fetchEntries(userId)]);
        if (id !== requestId.current) return; // a newer request has since started
        syncedEntryIds.current = new Set(entryRows.map((r) => r.id));
        dispatch({ type: 'hydrate', data: fromRows(profile, entryRows) });
      } catch (e) {
        console.warn('[go-beyond] failed to load your data:', e instanceof Error ? e.message : e);
      }
    })();
  }, [userId]);

  // Whenever the profile-level fields change, write them back. Runs once right after the
  // initial fetch too (writing back what was just read), which is a harmless no-op.
  useEffect(() => {
    if (!state.ready || !userId) return;
    withRetry('save profile', () =>
      supabase
        .from('profiles')
        .update({
          zone: state.zone,
          xp: state.xp,
          streak: state.streak,
          last_completed: state.lastCompleted,
          today: state.today,
          onboarded: state.onboarded,
        })
        .eq('id', userId),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ready, userId, state.zone, state.xp, state.streak, state.lastCompleted, state.today, state.onboarded]);

  // Insert any journal entries that haven't made it to Supabase yet.
  useEffect(() => {
    if (!state.ready || !userId) return;
    for (const e of state.entries) {
      if (syncedEntryIds.current.has(e.id)) continue;
      syncedEntryIds.current.add(e.id);
      withRetry('save entry', () =>
        supabase.from('entries').insert({
          id: e.id,
          user_id: userId,
          type: e.type,
          title: e.title,
          tag: e.tag,
          feel: e.feel ?? null,
          created_at: new Date(e.ts).toISOString(),
        }),
      );
    }
  }, [state.ready, userId, state.entries]);

  const finishBaseline = useCallback(
    (answers: number[]) => dispatch({ type: 'finishBaseline', zone: scoreBaseline(answers) }),
    [],
  );
  const completeOnboarding = useCallback(() => dispatch({ type: 'completeOnboarding' }), []);
  const ensureToday = useCallback(() => dispatch({ type: 'ensureToday', now: Date.now() }), []);
  const setShrunk = useCallback((shrunk: boolean) => dispatch({ type: 'setShrunk', shrunk }), []);
  const complete = useCallback(
    (feel?: string) => dispatch({ type: 'complete', id: Crypto.randomUUID(), feel, now: Date.now() }),
    [],
  );
  const addMoment = useCallback(
    (m: { title: string; tag: string; feel?: string }) =>
      dispatch({ type: 'addMoment', id: Crypto.randomUUID(), ...m, now: Date.now() }),
    [],
  );
  const resetAll = useCallback(() => {
    if (userId) {
      syncedEntryIds.current = new Set();
      supabase
        .from('entries')
        .delete()
        .eq('user_id', userId)
        .then(({ error }) => error && console.warn('[go-beyond] reset (entries) failed:', error.message));
      supabase
        .from('profiles')
        .update({ zone: DEFAULT_ZONE, xp: 0, streak: 0, last_completed: null, today: null, onboarded: false })
        .eq('id', userId)
        .then(({ error }) => error && console.warn('[go-beyond] reset (profile) failed:', error.message));
    }
    dispatch({ type: 'reset' });
  }, [userId]);

  const value = useMemo<Store>(
    () => ({ state, finishBaseline, completeOnboarding, ensureToday, setShrunk, complete, addMoment, resetAll }),
    [state, finishBaseline, completeOnboarding, ensureToday, setShrunk, complete, addMoment, resetAll],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

/** Today's challenge with everything a screen needs to render it. */
export function useToday() {
  const { state } = useStore();
  const t = state.today;
  if (!t) return null;
  const level = effectiveLevel(t);
  return {
    today: t,
    level,
    baseLevel: t.level,
    challenge: CHALLENGES[t.dim][level],
    dimLabel: DIMENSIONS[t.dim],
    tips: TIPS[t.dim],
  };
}
