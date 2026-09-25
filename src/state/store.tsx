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
  note?: string;
  ts: number;
};

export type QuestItem = {
  id: string;
  dim: DimIndex;
  /** The level the app picked from your edge, fixed for the day. */
  level: Level;
  done: boolean;
  doneAt?: number;
};

export type TodayQuests = {
  date: string;
  /** Candidates not yet swiped on, weakest dimension first. */
  pool: QuestItem[];
  /** Candidates swiped right on — no cap, could be none or all of them. */
  accepted: QuestItem[];
};

export type Persisted = {
  onboarded: boolean;
  /** Editable display name; falls back to the email's local part when null. */
  name: string | null;
  /** Comfort zone per dimension, 0..1. */
  zone: number[];
  xp: number;
  streak: number;
  lastCompleted: string | null;
  completedDays: string[];
  today: TodayQuests | null;
  entries: Entry[];
};

export type State = Persisted & { ready: boolean };

const DEFAULT_ZONE = [0.3, 0.3, 0.3, 0.3, 0.3, 0.3];

const EMPTY: Persisted = {
  onboarded: false,
  name: null,
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

/** The single weakest dimension — used for the Zone screen's "next edge" preview. */
export const weakestDim = (zone: number[], avoid?: number): DimIndex => {
  const order = zone.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const pick = order.find((o) => o.i !== avoid) ?? order[0];
  return pick.i as DimIndex;
};

/** Every dimension, weakest first — the order candidates are offered in the swipe stack. */
function allDimsByWeakness(zone: number[]): DimIndex[] {
  return zone
    .map((v, i) => ({ v, i }))
    .sort((a, b) => a.v - b.v)
    .map((o) => o.i as DimIndex);
}

export function previewCompletion(state: Pick<State, 'zone' | 'today'>, itemId: string) {
  const item = state.today?.accepted.find((i) => i.id === itemId);
  if (!item || item.done) return null;
  const to = state.zone.map((v, i) => (i === item.dim ? Math.min(1, v + GAIN[item.level]) : v));
  return { dim: item.dim, level: item.level, from: state.zone, to, xpGain: XP[item.level] };
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
    note: r.note ?? undefined,
    ts: new Date(r.created_at).getTime(),
  }));
  const rawToday = profile?.today as TodayQuests | null | undefined;
  // Defends against a `today` shape from an earlier version of the app (a single challenge, or
  // a fixed 3-item checklist) — treat it as absent so ensureToday regenerates a proper one,
  // rather than crashing on missing pool/accepted arrays.
  const today = rawToday && Array.isArray(rawToday.pool) && Array.isArray(rawToday.accepted) ? rawToday : null;
  return {
    onboarded: profile?.onboarded ?? false,
    name: profile?.name ?? null,
    zone: profile?.zone && profile.zone.length === 6 ? profile.zone : DEFAULT_ZONE,
    xp: profile?.xp ?? 0,
    streak: profile?.streak ?? 0,
    lastCompleted: profile?.last_completed ?? null,
    completedDays: computeCompletedDays(entries),
    today,
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
  | { type: 'setName'; name: string | null }
  | { type: 'ensureToday'; now: number; ids: string[] }
  | { type: 'swipeCandidate'; id: string; accept: boolean }
  | { type: 'completeItem'; itemId: string; entryId: string; feel?: string; now: number }
  | { type: 'addMoment'; id: string; title: string; tag: string; feel?: string; note?: string; now: number }
  | { type: 'deleteEntry'; id: string }
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

    case 'setName':
      return { ...state, name: action.name };

    case 'ensureToday': {
      const key = dayKey(action.now);
      if (state.today && state.today.date === key) return state;
      const dims = allDimsByWeakness(state.zone);
      const pool: QuestItem[] = dims.map((dim, i) => ({
        id: action.ids[i],
        dim,
        level: levelFor(state.zone[dim]),
        done: false,
      }));
      return { ...state, today: { date: key, pool, accepted: [] } };
    }

    case 'swipeCandidate': {
      const t = state.today;
      const item = t?.pool.find((i) => i.id === action.id);
      if (!t || !item) return state;
      const pool = t.pool.filter((i) => i.id !== action.id);
      const accepted = action.accept ? [...t.accepted, item] : t.accepted;
      return { ...state, today: { ...t, pool, accepted } };
    }

    case 'completeItem': {
      const t = state.today;
      const item = t?.accepted.find((i) => i.id === action.itemId);
      if (!t || !item || item.done) return state;
      const zone = state.zone.map((v, i) => (i === item.dim ? Math.min(1, v + GAIN[item.level]) : v));
      const accepted = t.accepted.map((i) => (i.id === item.id ? { ...i, done: true, doneAt: action.now } : i));
      // A day only "counts" once at least one challenge was accepted and every accepted one is done.
      const allDone = accepted.length > 0 && accepted.every((i) => i.done);
      const key = dayKey(action.now);
      const streak = !allDone
        ? state.streak
        : state.lastCompleted === key
          ? state.streak
          : state.lastCompleted === yesterdayKey(action.now)
            ? state.streak + 1
            : 1;
      const entry: Entry = {
        id: action.entryId,
        type: 'challenge',
        title: CHALLENGES[item.dim][item.level].done,
        tag: DIMENSIONS[item.dim],
        feel: action.feel,
        ts: action.now,
      };
      return {
        ...state,
        zone,
        xp: state.xp + XP[item.level],
        streak,
        lastCompleted: allDone ? key : state.lastCompleted,
        completedDays:
          allDone && !state.completedDays.includes(key) ? [...state.completedDays, key] : state.completedDays,
        today: { ...t, accepted },
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
        note: action.note,
        ts: action.now,
      };
      return { ...state, entries: [entry, ...state.entries] };
    }

    case 'deleteEntry': {
      const entries = state.entries.filter((e) => e.id !== action.id);
      return { ...state, entries, completedDays: computeCompletedDays(entries) };
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
  const fallback = { id: userId, name: null, zone: DEFAULT_ZONE, xp: 0, streak: 0, last_completed: null, today: null, onboarded: false };
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
  setName: (name: string) => void;
  ensureToday: () => void;
  swipeCandidate: (id: string, accept: boolean) => void;
  completeItem: (itemId: string, feel?: string) => void;
  addMoment: (m: { title: string; tag: string; feel?: string; note?: string }) => void;
  deleteEntry: (id: string) => void;
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
          name: state.name,
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
  }, [state.ready, userId, state.name, state.zone, state.xp, state.streak, state.lastCompleted, state.today, state.onboarded]);

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
          note: e.note ?? null,
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
  const setName = useCallback((name: string) => dispatch({ type: 'setName', name: name.trim() || null }), []);
  const ensureToday = useCallback(() => {
    const ids = Array.from({ length: DIMENSIONS.length }, () => Crypto.randomUUID());
    dispatch({ type: 'ensureToday', now: Date.now(), ids });
  }, []);
  const swipeCandidate = useCallback(
    (id: string, accept: boolean) => dispatch({ type: 'swipeCandidate', id, accept }),
    [],
  );
  const completeItem = useCallback(
    (itemId: string, feel?: string) =>
      dispatch({ type: 'completeItem', itemId, entryId: Crypto.randomUUID(), feel, now: Date.now() }),
    [],
  );
  const addMoment = useCallback(
    (m: { title: string; tag: string; feel?: string; note?: string }) =>
      dispatch({ type: 'addMoment', id: Crypto.randomUUID(), ...m, now: Date.now() }),
    [],
  );
  const deleteEntry = useCallback(
    (id: string) => {
      dispatch({ type: 'deleteEntry', id });
      syncedEntryIds.current.delete(id);
      if (userId) {
        withRetry('delete entry', () => supabase.from('entries').delete().eq('id', id).eq('user_id', userId));
      }
    },
    [userId],
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
    () => ({
      state,
      finishBaseline,
      completeOnboarding,
      setName,
      ensureToday,
      swipeCandidate,
      completeItem,
      addMoment,
      deleteEntry,
      resetAll,
    }),
    [
      state,
      finishBaseline,
      completeOnboarding,
      setName,
      ensureToday,
      swipeCandidate,
      completeItem,
      addMoment,
      deleteEntry,
      resetAll,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

export type EnrichedItem = QuestItem & {
  challenge: (typeof CHALLENGES)[DimIndex][Level];
  dimLabel: string;
  tips: [string, string, string];
};

function enrich(item: QuestItem): EnrichedItem {
  return { ...item, challenge: CHALLENGES[item.dim][item.level], dimLabel: DIMENSIONS[item.dim], tips: TIPS[item.dim] };
}

/** Today's swipe pool and accepted checklist, enriched with actual challenge text. */
export function useTodayQuests() {
  const { state } = useStore();
  const t = state.today;
  if (!t) return null;
  const pool = t.pool.map(enrich);
  const accepted = t.accepted.map(enrich);
  const completedCount = accepted.filter((i) => i.done).length;
  return { quests: t, pool, accepted, completedCount, total: accepted.length };
}

/** One specific accepted item — what Focus and Complete need. */
export function useQuestItem(itemId: string | undefined) {
  const { state } = useStore();
  const item = itemId ? state.today?.accepted.find((i) => i.id === itemId) : undefined;
  return item ? enrich(item) : null;
}
