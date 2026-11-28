import type { Task } from '../models';

import { dailySeed, interleaveByTopic } from './interleave';

const task = (id: string, topic?: Task['topic']): Task => ({
  id, topic, title: id, shortDesc: '', fullDesc: '', location: 'in', duration: 15, ageGroups: ['family'],
});
const adjacentSame = (tasks: Task[]): number => tasks.filter((t, i) => i > 0 && t.topic === tasks[i - 1].topic).length;

describe('interleaveByTopic', () => {
  const pool = [
    ...Array.from({ length: 6 }, (_, i) => task(`cook${i}`, 'cook')),
    ...Array.from({ length: 6 }, (_, i) => task(`craft${i}`, 'craft')),
    ...Array.from({ length: 3 }, (_, i) => task(`game${i}`, 'game')),
    ...Array.from({ length: 3 }, (_, i) => task(`kind${i}`, 'kind')),
  ];

  it('never puts two ideas of the same topic next to each other when the pool allows it', () => {
    for (const seed of [null, 'a', 'b', '2026-12-1', '2026-12-2']) {
      const result = interleaveByTopic(pool, seed);
      expect(result).toHaveLength(pool.length);
      expect(new Set(result.map((t) => t.id)).size).toBe(pool.length);
      expect(adjacentSame(result)).toBe(0);
    }
  });

  it('rotates through all topics instead of ping-ponging between the two biggest', () => {
    const big = [
      ...Array.from({ length: 10 }, (_, i) => task(`o${i}`, 'outdoor')),
      ...Array.from({ length: 9 }, (_, i) => task(`c${i}`, 'craft')),
      ...Array.from({ length: 4 }, (_, i) => task(`k${i}`, 'cook')),
      ...Array.from({ length: 4 }, (_, i) => task(`g${i}`, 'game')),
    ];
    const first = interleaveByTopic(big, 'seed').slice(0, 8).map((t) => t.topic);
    expect(new Set(first).size).toBe(4);
  });

  it('is stable for one seed and differs between seeds', () => {
    const ids = (seed: string | null): string => interleaveByTopic(pool, seed).map((t) => t.id).join(',');
    expect(ids('2026-12-1')).toBe(ids('2026-12-1'));
    expect(ids('2026-12-1')).not.toBe(ids('2026-12-2'));
  });

  it('keeps the original order without a seed and when there is only one topic', () => {
    const same = [task('a'), task('b'), task('c')];
    expect(interleaveByTopic(same, null).map((t) => t.id)).toEqual(['a', 'b', 'c']);
    expect(interleaveByTopic(same, 'x')).toHaveLength(3);
  });

  it('puts the unavoidable repeats at the end when one topic dominates', () => {
    const lopsided = [task('a1', 'cook'), task('a2', 'cook'), task('a3', 'cook'), task('b1', 'craft')];
    const result = interleaveByTopic(lopsided, null);
    expect(result[0].topic).toBe('cook');
    expect(adjacentSame(result)).toBe(1);
  });

  it('builds a daily seed', () => {
    expect(dailySeed(new Date(2026, 11, 5))).toBe('2026-12-5');
  });
});
