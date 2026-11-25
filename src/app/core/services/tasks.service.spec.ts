import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import type { Task } from '../models';
import { Language } from '../models';

import { StorageService } from './storage.service';
import { TasksService } from './tasks.service';

describe('TasksService filtering', () => {
  const task = (id: string, duration: Task['duration'], location: Task['location'] = 'in'): Task => ({
    id, duration, location, title: id, shortDesc: '', fullDesc: '',
    ageGroups: ['family'],
  });
  const language = signal(Language.English);
  const storage = {
    isTaskSaved: vi.fn(),
    isTaskCompleted: vi.fn(),
    language,
  };
  const http = { get: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    language.set(Language.English);
    http.get.mockReturnValue(of([
      task('later', 15), task('five', 5), task('new', 15),
      task('never', 15), task('completed', 15), task('outside', 15, 'out'),
      task('hour', 60),
    ]));
    storage.isTaskSaved.mockImplementation((id: string) => id === 'new');
    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: http },
        { provide: StorageService, useValue: storage },
      ],
    });
  });

  it('filters by exact duration, keeps saved ideas at the very end and skips excluded / completed ones', async () => {
    storage.isTaskCompleted.mockImplementation((id: string) => id === 'completed');
    const service = TestBed.inject(TasksService);
    await service.loadTasks();
    const ids = (options: Parameters<TasksService['filterTasks']>[0]): string[] =>
      service.filterTasks(options).map((t) => t.id);
    // 'new' is saved: it stays in the pool but is queued last; 'completed' is dropped.
    expect(ids({ location: 'in', duration: 15, ageGroups: ['family'] })).toEqual(['later', 'never', 'new']);
    expect(ids({ location: 'in', duration: 15, ageGroups: ['family'], exclude: new Set(['never', 'new']) }))
      .toEqual(['later']);
    expect(ids({ location: 'out', duration: 15, ageGroups: ['family'] })).toEqual(['outside']);
    expect(ids({ location: 'in', duration: 60, ageGroups: ['family'] })).toEqual(['hour']);
    expect(ids({ location: 'in', duration: 15, ageGroups: ['adults'] })).toEqual([]);
  });

  it('loads the translated texts of the current language and falls back to English per idea', async () => {
    http.get.mockImplementation((url: string) => url.includes('tasks.ua.json')
      ? of({ 'with-ua': { title: 'Привіт', shortDesc: 'к', fullDesc: 'п' } })
      : of([{ ...task('with-ua', 15), title: 'Hello' }, task('no-ua', 15)]));
    const service = TestBed.inject(TasksService);
    await service.loadTasks();
    expect(service.getTaskById('with-ua')?.title).toBe('Hello');
    expect(http.get).not.toHaveBeenCalledWith('assets/data/tasks.en.json');
    language.set(Language.Ukrainian);
    TestBed.tick();
    await vi.waitFor(() => expect(service.getTaskById('with-ua')?.title).toBe('Привіт'));
    expect(service.getTaskById('no-ua')?.title).toBe('no-ua');
    expect(http.get).toHaveBeenCalledWith('assets/data/tasks.ua.json');
  });

  it('keeps English when a language file is missing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    http.get.mockImplementation((url: string) => url.includes('tasks.pl.json')
      ? throwError(() => new Error('404'))
      : of([task('one', 15)]));
    language.set(Language.Polish);
    const service = TestBed.inject(TasksService);
    await service.loadTasks();
    expect(service.getTaskById('one')?.title).toBe('one');
    warn.mockRestore();
  });
});
