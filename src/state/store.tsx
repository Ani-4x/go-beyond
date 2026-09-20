import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
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

const STORAGE_KEY = 'gobeyond:v1';

const EMPTY: Persisted = {
  onboarded: false,
  zone: [0.3, 0.3, 0.3, 0.3, 0.3, 0.3],
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

const makeId = (now: number) => `${now}-${Math.random().toString(36).slice(2, 7)}`;

/* ------------------------------------------------------------------ */
/* Reducer                                                             */
/* ------------------------------------------------------------------ */

type Action =
  | { type: 'hydrate'; data: Persisted | null }
  | { type: 'finishBaseline'; zone: number[] }
  | { type: 'completeOnboarding' }
  | { type: 'ensureToday'; now: number }
  | { type: 'setShrunk'; shrunk: boolean }
  | { type: 'complete'; feel?: string; now: number }
  | { type: 'addMoment'; title: string; tag: string; feel?: string; now: number }
  | { type: 'reset' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return { ...EMPTY, ...(action.data ?? {}), ready: true };

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
        id: makeId(action.now),
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
        id: makeId(action.now),
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
  const [state, dispatch] = useReducer(reducer, { ...EMPTY, ready: false });

  // Load once.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        let data: Persisted | null = null;
        try {
          const parsed = raw ? (JSON.parse(raw) as Persisted) : null;
          if (parsed && Array.isArray(parsed.zone) && parsed.zone.length === 6) data = parsed;
        } catch {
          data = null;
        }
        dispatch({ type: 'hydrate', data });
      })
      .catch(() => dispatch({ type: 'hydrate', data: null }));
  }, []);

  // Save on every change after the first load.
  useEffect(() => {
    if (!state.ready) return;
    const { ready: _ready, ...persisted } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persisted)).catch(() => {});
  }, [state]);

  const finishBaseline = useCallback(
    (answers: number[]) => dispatch({ type: 'finishBaseline', zone: scoreBaseline(answers) }),
    [],
  );
  const completeOnboarding = useCallback(() => dispatch({ type: 'completeOnboarding' }), []);
  const ensureToday = useCallback(() => dispatch({ type: 'ensureToday', now: Date.now() }), []);
  const setShrunk = useCallback((shrunk: boolean) => dispatch({ type: 'setShrunk', shrunk }), []);
  const complete = useCallback((feel?: string) => dispatch({ type: 'complete', feel, now: Date.now() }), []);
  const addMoment = useCallback(
    (m: { title: string; tag: string; feel?: string }) => dispatch({ type: 'addMoment', ...m, now: Date.now() }),
    [],
  );
  const resetAll = useCallback(() => dispatch({ type: 'reset' }), []);

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
