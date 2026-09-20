const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day as YYYY-MM-DD. */
export const dayKey = (d: Date | number = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};

export const yesterdayKey = (now: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return dayKey(d);
};

/** Monday-first week containing `now`. */
export function weekDays(now: number = Date.now()) {
  const d = new Date(now);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return { key: dayKey(x), label: 'MTWTFSS'[i] };
  });
}

export const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export function dayLabel(ts: number, now: number = Date.now()) {
  const a = new Date(ts);
  const b = new Date(now);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return a.toLocaleDateString([], { weekday: 'long' });
  return a.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const longDate = (now: number = Date.now()) =>
  new Date(now).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' });
