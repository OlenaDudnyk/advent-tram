import { TestBed } from '@angular/core/testing';

import { CalendarService, adventSundays, calendarDays, isCalendarDate, sundayTask } from './calendar.service';
import { StorageService } from './storage.service';

describe('CalendarService', () => {
  let stored: unknown;
  let legacy: unknown;
  const storage = {
    loadCalendar: vi.fn(() => stored),
    loadLegacyCalendar: vi.fn(() => legacy),
    saveCalendar: vi.fn((value: unknown) => { stored = structuredClone(value); }),
  };

  beforeEach(() => {
    stored = null;
    legacy = null;
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [{ provide: StorageService, useValue: storage }] });
  });

  it('calculates four Sundays strictly before Christmas for different years', () => {
    expect(adventSundays(2026)).toEqual(['2026-11-29', '2026-12-06', '2026-12-13', '2026-12-20']);
    expect(adventSundays(2027)).toEqual(['2027-11-28', '2027-12-05', '2027-12-12', '2027-12-19']);
    expect(adventSundays(2022)).toEqual(['2022-11-27', '2022-12-04', '2022-12-11', '2022-12-18']);
    expect(adventSundays(2023)).toEqual(['2023-12-03', '2023-12-10', '2023-12-17', '2023-12-24']);
    expect(calendarDays(2026)).toHaveLength(33);
    expect(calendarDays(2023)[0]).toBe('2023-12-03');
    expect(calendarDays(2026).at(-1)).toBe('2026-12-31');
    expect(isCalendarDate('2026-11-28')).toBe(false);
    expect(isCalendarDate('2026-11-31')).toBe(false);
    expect(isCalendarDate('2026-12-29', 2027)).toBe(false);
  });

  it('keeps task schedules and completion separate by full date and year', () => {
    const calendar = TestBed.inject(CalendarService);
    calendar.load();
    calendar.schedule('2026-11-29', 'one');
    calendar.schedule('2026-12-29', 'two');
    calendar.schedule('2026-12-29', 'two');
    calendar.schedule('2027-12-29', 'one');
    calendar.complete('2026-11-29', 'one');
    calendar.load();
    expect(calendar.scheduled('2026-11-29')).toEqual(['one']);
    expect(calendar.scheduled('2026-12-29')).toEqual(['two']);
    expect(calendar.scheduled('2027-12-29')).toEqual(['one']);
    expect(calendar.isCompleted('2026-11-29', 'one')).toBe(true);
    expect(calendar.isCompleted('2027-12-29', 'one')).toBe(false);
  });

  it('migrates existing December 2026 data without modifying the original', () => {
    legacy = { scheduled: { 6: ['one', 'two'], 29: ['one'] }, completed: { 6: ['sunday_silence_6', 'one'] } };
    const calendar = TestBed.inject(CalendarService);
    calendar.load();
    expect(calendar.scheduled('2026-12-06')).toEqual(['one', 'two']);
    expect(calendar.scheduled('2026-12-29')).toEqual(['one']);
    expect(calendar.isCompleted('2026-12-06', sundayTask(6).id)).toBe(true);
    expect(legacy).toEqual({ scheduled: { 6: ['one', 'two'], 29: ['one'] }, completed: { 6: ['sunday_silence_6', 'one'] } });
    expect(stored).toEqual({
      scheduled: { '2026-12-06': ['one', 'two'], '2026-12-29': ['one'] },
      completed: { '2026-12-06': ['sunday_silence_6', 'one'] },
    });
  });

  it('rejects invalid data and leaves in-memory state unchanged on write failure', () => {
    const calendar = TestBed.inject(CalendarService);
    calendar.load();
    expect(() => calendar.schedule('2026-11-28', 'one')).toThrow();
    storage.saveCalendar.mockImplementationOnce(() => { throw new Error('full'); });
    expect(() => calendar.schedule('2026-12-01', 'one')).toThrow();
    expect(calendar.scheduled('2026-12-01')).toEqual([]);
    stored = { scheduled: { '2026-12-32': ['one'] }, completed: {} };
    expect(() => calendar.load()).toThrow();
  });
});
