import type { IconName } from '../components/Icons';

export const DIMENSIONS = [
  'Confidence',
  'Social',
  'Discipline',
  'Learning',
  'Experience',
  'Openness',
] as const;

export type DimIndex = 0 | 1 | 2 | 3 | 4 | 5;

export type Question = { dim: DimIndex; prompt: string; options: [string, string, string, string] };

/** Situational questions: answers describe behavior, not self-ratings. Option index = score 0..3. */
export const QUESTIONS: Question[] = [
  {
    dim: 0,
    prompt: 'A group is deciding something and you see it differently. What do you do?',
    options: [
      'Stay quiet and go along',
      'Mention it to one person afterwards',
      'Share it if there is a gap in the talk',
      'Say it plainly, even if it is unpopular',
    ],
  },
  {
    dim: 2,
    prompt: 'You planned to start something at 7 AM. It is 7 AM. What happens?',
    options: [
      'I find a reason to start tomorrow',
      'I start late, if at all',
      'I start, but it takes effort',
      'I start. It is just what I do',
    ],
  },
  {
    dim: 1,
    prompt: 'You arrive somewhere where you barely know anyone. What do you do?',
    options: [
      'Stay close to the one person I know',
      'Wait for someone to talk to me',
      'Introduce myself if the moment feels right',
      'Start conversations with new people',
    ],
  },
  {
    dim: 3,
    prompt: 'You run into a topic you know nothing about. What is your first move?',
    options: [
      'Skip past it',
      'Skim it if it is easy to find',
      'Look it up and read a bit',
      'Dive in until it clicks',
    ],
  },
  {
    dim: 4,
    prompt: 'A friend suggests a place you have never been. You…',
    options: [
      'Suggest somewhere familiar instead',
      'Go, but feel unsure the whole time',
      'Say yes if the plan is clear',
      'Say yes right away',
    ],
  },
  {
    dim: 5,
    prompt: 'Someone shows you a way of doing things that differs from yours.',
    options: [
      'Politely ignore it',
      'Try it only if pushed',
      'Try it once',
      'Try it and keep what works',
    ],
  },
  {
    dim: 1,
    prompt: 'A stranger sits next to you and there is a quiet moment.',
    options: [
      'Look at my phone',
      'Nod and smile',
      'Say hello',
      'Start a real conversation',
    ],
  },
  {
    dim: 0,
    prompt: 'You have to speak in front of others tomorrow.',
    options: [
      'I dread it and avoid preparing',
      'I over-prepare to feel safe',
      'I feel nervous, but I do it',
      'I look forward to it',
    ],
  },
];

export type Level = 1 | 2 | 3;

export type Challenge = {
  text: string;
  minutes: number;
  /** Past-tense line for the journal. */
  done: string;
};

/** Three difficulty levels per dimension. */
export const CHALLENGES: Record<DimIndex, Record<Level, Challenge>> = {
  0: {
    1: { text: 'Share a small opinion with someone today, like a food or movie pick.', minutes: 2, done: 'Shared a small opinion' },
    2: { text: 'Politely disagree with someone in a low-stakes moment, and say why.', minutes: 5, done: 'Politely disagreed and explained why' },
    3: { text: 'Speak up in a group and offer your view before anyone asks.', minutes: 10, done: 'Spoke up in a group unprompted' },
  },
  1: {
    1: { text: 'Say hello to someone you pass today and ask one small question.', minutes: 2, done: 'Said hello and asked one small question' },
    2: { text: "Start a conversation with someone you don't normally talk to.", minutes: 10, done: 'Started a conversation with someone new' },
    3: { text: 'Invite someone you barely know to a coffee or a walk.', minutes: 20, done: 'Invited someone new for coffee or a walk' },
  },
  2: {
    1: { text: 'Work on something you have been putting off for just five minutes.', minutes: 5, done: 'Spent five minutes on something I was avoiding' },
    2: { text: 'Finish one task you have been avoiding, start to finish.', minutes: 25, done: 'Finished a task I was avoiding' },
    3: { text: 'Do your hardest task first, before checking anything else.', minutes: 45, done: 'Did my hardest task first' },
  },
  3: {
    1: { text: 'Read or watch something for ten minutes on a topic you know nothing about.', minutes: 10, done: 'Explored a topic I knew nothing about' },
    2: { text: 'Learn one new thing and explain it to someone in your own words.', minutes: 20, done: 'Learned something and explained it' },
    3: { text: 'Try a beginner exercise in a skill you have never attempted.', minutes: 30, done: 'Tried a beginner exercise in a new skill' },
  },
  4: {
    1: { text: 'Take a different route somewhere today and notice one new thing.', minutes: 5, done: 'Took a different route and noticed something new' },
    2: { text: 'Visit a place nearby that you have never been to.', minutes: 40, done: 'Visited a place I had never been to' },
    3: { text: 'Do something you have never tried before, alone or with someone.', minutes: 60, done: 'Tried something for the first time' },
  },
  5: {
    1: { text: 'Ask someone how they would do something you usually do your own way.', minutes: 5, done: 'Asked how someone else does it' },
    2: { text: 'Try a method or a food you would normally skip.', minutes: 15, done: 'Tried something I would normally skip' },
    3: { text: 'Say yes to something you would normally decline, within reason.', minutes: 30, done: 'Said yes to something I would normally decline' },
  },
};

export const TIPS: Record<DimIndex, [string, string, string]> = {
  0: ['Start with something low-stakes.', 'One clear sentence is enough.', 'You can be kind and still be direct.'],
  1: ['Ask what they are reading or watching.', 'Compliment one specific thing.', 'Say "Hi, I am…" and see where it goes.'],
  2: ['Set a five-minute timer and just begin.', 'Put your phone in another room.', 'Stop when the timer ends if you want to.'],
  3: ['Pick one source and stay with it.', 'Write down one thing that surprised you.', 'Explain it out loud once.'],
  4: ['Leave earlier than you need to.', 'Notice three things you have not seen before.', 'Take one photo of something new.'],
  5: ['Ask "why do you do it that way?"', 'Try it once before deciding.', 'Keep whatever works for you.'],
};

/** How far the edge moves and how much XP a challenge earns, by level. */
export const GAIN: Record<Level, number> = { 1: 0.02, 2: 0.04, 3: 0.06 };
export const XP: Record<Level, number> = { 1: 20, 2: 30, 3: 40 };
export const LEVEL_LABEL: Record<Level, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

/** The gap between where you are comfortable and your edge. */
export const EDGE_GAP = 0.15;

/** Color + icon for a challenge entry, keyed by dimension — used in the journal and checklist. */
export const DIMENSION_STYLE: Record<DimIndex, { color: string; icon: IconName }> = {
  0: { color: '#8B7FFF', icon: 'brain' },
  1: { color: '#6C6FE0', icon: 'people' },
  2: { color: '#FF9F45', icon: 'chart' },
  3: { color: '#8B7FFF', icon: 'brain' },
  4: { color: '#4FA8E8', icon: 'pin' },
  5: { color: '#4CC38A', icon: 'leaf' },
};

export const MOMENT_CATEGORIES: { key: string; hint: string; color: string; icon: IconName }[] = [
  { key: 'Reflect', hint: 'Learn, read, or think.', color: '#8B7FFF', icon: 'brain' },
  { key: 'Move', hint: 'Exercise or get outside.', color: '#5B8DEF', icon: 'run' },
  { key: 'Connect', hint: 'Spend time with someone.', color: '#6C6FE0', icon: 'people' },
  { key: 'Explore', hint: 'Try or visit something new.', color: '#4FA8E8', icon: 'pin' },
  { key: 'Build', hint: 'Work toward a goal.', color: '#FF9F45', icon: 'chart' },
  { key: 'Reset', hint: 'Rest and make space.', color: '#4CC38A', icon: 'leaf' },
];

/** Looks up the color + icon for any journal entry, challenge or moment. */
export function styleForEntry(type: 'challenge' | 'moment', tag: string): { color: string; icon: IconName } {
  if (type === 'challenge') {
    const dim = DIMENSIONS.indexOf(tag as (typeof DIMENSIONS)[number]);
    if (dim >= 0) return DIMENSION_STYLE[dim as DimIndex];
  }
  return MOMENT_CATEGORIES.find((c) => c.key === tag) ?? { color: '#8B7FFF', icon: 'brain' };
}

export const FEELINGS = ['Low', 'Steady', 'Good', 'Bright'] as const;

export const ZERO_ZONE = [0, 0, 0, 0, 0, 0];

/** Rotates by day so the hero card's quote feels alive without any extra state to track. */
export const QUOTES = [
  'Growth lives outside your comfort zone.',
  'Small steps, repeated, become a different life.',
  'The edge moves only when you step past it.',
  'Comfort is a place to visit, not to live.',
  'Today is just one more brick in the wall you\u2019re building.',
];
