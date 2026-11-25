import { Injectable, inject, signal } from '@angular/core';

import type { Task } from '../models';

import { StorageService } from './storage.service';

export function calendarDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseCalendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  if (year < 100) return null;
  const date = new Date(year, Number(match[2]) - 1, Number(match[3]), 12);
  return calendarDate(date) === value ? date : null;
}

export function adventSundays(year: number): string[] {
  const christmas = new Date(year, 11, 25, 12);
  const lastSunday = new Date(year, 11, 25 - (christmas.getDay() || 7), 12);
  return Array.from({ length: 4 }, (_, index) => {
    const date = new Date(lastSunday);
    date.setDate(date.getDate() - (3 - index) * 7);
    return calendarDate(date);
  });
}

export function isCalendarDate(value: string, year?: number): boolean {
  const date = parseCalendarDate(value);
  if (!date || (year !== undefined && date.getFullYear() !== year)) return false;
  return value >= adventSundays(date.getFullYear())[0] && value <= `${date.getFullYear()}-12-31`;
}

export function calendarDays(year: number): string[] {
  const date = parseCalendarDate(adventSundays(year)[0])!;
  const days: string[] = [];
  while (date.getFullYear() === year) {
    days.push(calendarDate(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export function sundayTask(day: number): Task {
  return {
    id: `sunday_silence_${day}`,
    title: 'Light a little hope',
    shortDesc: 'A little light. A quiet moment.',
    fullDesc: 'Light a candle together. Think of someone who could use a little hope, then send them a kind message.',
    location: 'in', duration: 5, ageGroups: ['kids_3_6', 'kids_7_12', 'adults', 'family'],
    category: 'sunday_silence',
    reflection: {
      en: 'In the darkest days, a small light reminds us we are not alone. Let yours be a promise to notice someone, listen a little longer, and share a little warmth.',
      ua: 'У найтемніші дні маленьке світло нагадує, що ми не самі. Помітьмо когось поруч, послухаймо трохи довше і поділимося теплом.',
      pl: 'W najciemniejsze dni małe światło przypomina nam, że nie jesteśmy sami. Niech Wasze będzie obietnicą, że zauważycie kogoś, posłuchacie odrobinę dłużej i podzielicie się odrobiną ciepła.',
      es: 'En los días más oscuros, una pequeña luz nos recuerda que no estamos solos. Que la tuya sea una promesa de fijarte en alguien, escuchar un poco más y compartir un poco de calor.',
      de: 'In den dunkelsten Tagen erinnert uns ein kleines Licht daran, dass wir nicht allein sind. Lass deines ein Versprechen sein: jemanden zu bemerken, ein bisschen länger zuzuhören und ein wenig Wärme zu teilen.',
      fr: 'Dans les jours les plus sombres, une petite lumière nous rappelle que nous ne sommes pas seuls. Que la vôtre soit la promesse de remarquer quelqu\'un, d\'écouter un peu plus longtemps et de partager un peu de chaleur.',
    },
  };
}

interface CalendarState {
  scheduled: Record<string, string[]>;
  completed: Record<string, string[]>;
}

function parseDays(value: unknown, legacy = false): Record<string, string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid calendar days');
  const days: Record<string, string[]> = {};
  for (const [key, ids] of Object.entries(value)) {
    const day = legacy && /^(?:[1-9]|[12]\d|3[01])$/.test(key) ? `2026-12-${key.padStart(2, '0')}` : key;
    if (!isCalendarDate(day) || !Array.isArray(ids) ||
        !ids.every((id: unknown) => typeof id === 'string' && id.length > 0) ||
        new Set(ids).size !== ids.length) throw new Error('Invalid calendar entry');
    days[day] = ids;
  }
  return days;
}

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private readonly storage = inject(StorageService);
  private readonly state = signal<CalendarState>({ scheduled: {}, completed: {} });

  load(): void {
    let value = this.storage.loadCalendar();
    let legacy = false;
    if (value === null) {
      value = this.storage.loadLegacyCalendar();
      legacy = value !== null;
    }
    if (value === null) { this.state.set({ scheduled: {}, completed: {} }); return; }
    if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid calendar data');
    const record = value as Record<string, unknown>;
    const state = { scheduled: parseDays(record['scheduled'], legacy), completed: parseDays(record['completed'], legacy) };
    if (legacy) this.storage.saveCalendar(state);
    this.state.set(state);
  }

  scheduled(day: string): readonly string[] {
    return this.state().scheduled[day] ?? [];
  }

  isCompleted(day: string, id: string): boolean {
    return this.state().completed[day]?.includes(id) ?? false;
  }

  /** Ids of every idea scheduled on any day. */
  allScheduledIds(): ReadonlySet<string> {
    return new Set(Object.values(this.state().scheduled).flat());
  }

  /** Ids of every idea completed on any day. */
  allCompletedIds(): ReadonlySet<string> {
    return new Set(Object.values(this.state().completed).flat());
  }

  /** Takes an idea off a day (and forgets its completion there), returning it to the deck pool. */
  unschedule(day: string, id: string): void {
    if (!isCalendarDate(day) || !id) throw new Error('Invalid calendar task');
    const state = this.state();
    const without = (days: Record<string, string[]>): Record<string, string[]> => {
      const rest = (days[day] ?? []).filter((taskId) => taskId !== id);
      const { [day]: _removed, ...others } = days;
      return rest.length ? { ...others, [day]: rest } : others;
    };
    const updated = { scheduled: without(state.scheduled), completed: without(state.completed) };
    this.storage.saveCalendar(updated);
    this.state.set(updated);
  }

  schedule(day: string, id: string): void {
    if (!isCalendarDate(day) || !id) throw new Error('Invalid calendar task');
    if (this.scheduled(day).includes(id)) return;
    this.update('scheduled', day, id);
  }

  complete(day: string, id: string): void {
    if (!isCalendarDate(day) || !id) throw new Error('Invalid calendar task');
    if (this.isCompleted(day, id)) return;
    this.update('completed', day, id);
  }

  private update(field: keyof CalendarState, day: string, id: string): void {
    const state = this.state();
    const updated = { ...state, [field]: { ...state[field], [day]: [...(state[field][day] ?? []), id] } };
    this.storage.saveCalendar(updated);
    this.state.set(updated);
  }
}
