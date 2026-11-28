import type { Task } from '../models';

/** Small deterministic PRNG (mulberry32) so the daily order is stable but different every day. */
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Orders ideas so that neighbouring cards come from different topics (recipes are never
 * back to back, crafts are never back to back, ...) whenever the pool allows it.
 * With a `seed` the order inside each topic is shuffled (stable for that seed); without one the
 * original order is kept. Tasks without a topic count as one topic of their own.
 */
export function interleaveByTopic(tasks: Task[], seed: string | null = null): Task[] {
  const random = seed ? seededRandom(seed) : null;
  const groups = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = task.topic ?? 'other';
    const group = groups.get(key);
    if (group) group.push(task);
    else groups.set(key, [task]);
  }
  if (random) {
    for (const group of groups.values()) {
      for (let i = group.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [group[i], group[j]] = [group[j], group[i]];
      }
    }
  }
  const result: Task[] = [];
  const recent: string[] = []; // topics of the last cards, newest last
  const memory = Math.max(1, Math.min(groups.size - 1, 3));
  while (result.length < tasks.length) {
    const candidates = [...groups.entries()].filter(([, group]) => group.length > 0);
    const last = recent[recent.length - 1];
    // prefer topics that were not shown in the last few cards, then any topic different from the previous one;
    // among them take the fullest topic so the pool does not end with a long run of one topic
    const fresh = candidates.filter(([key]) => !recent.slice(-memory).includes(key));
    const different = candidates.filter(([key]) => key !== last);
    const pool = fresh.length ? fresh : different.length ? different : candidates;
    const most = Math.max(...pool.map(([, group]) => group.length));
    const best = pool.filter(([, group]) => group.length === most);
    const [key, group] = best[random ? Math.floor(random() * best.length) : 0];
    result.push(group.shift()!);
    recent.push(key);
  }
  return result;
}

/** Seed that changes once a day: the deck order is stable during the day and fresh tomorrow. */
export function dailySeed(date = new Date()): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
