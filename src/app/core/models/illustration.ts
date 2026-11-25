import type { Task } from './task.model';

/** Path of the picture for a task; every task gets one (falls back by location). */
export function illustrationFor(task: Pick<Task, 'image' | 'location'>): string {
  const name = task.image ?? (task.location === 'out' ? 'idea-winter.svg' : 'gifts.svg');
  return `assets/${name}`;
}
