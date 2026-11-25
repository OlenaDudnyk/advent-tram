import { TestBed } from '@angular/core/testing';

import { StorageService } from './storage.service';

describe('saved task storage', () => {
  beforeEach(() => {
    localStorage.removeItem('advent_tram_task_state');
    TestBed.configureTestingModule({});
  });

  it('updates the signal, persists completion, and restores removed tasks', async () => {
    const storage = TestBed.inject(StorageService);
    await storage.loadTaskState();
    storage.saveTask('one');
    expect(storage.savedTaskIds().has('one')).toBe(true);
    storage.markSavedTaskCompleted('one');
    expect(storage.isTaskCompleted('one')).toBe(true);
    expect(storage.isTaskSaved('one')).toBe(true);
    storage.removeSavedTask('one');
    expect(storage.savedTaskIds().has('one')).toBe(false);
    expect((await storage.loadTaskState()).saved.has('one')).toBe(false);
  });

  it('rolls back a saved task if persistence fails', () => {
    const storage = TestBed.inject(StorageService);
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {});
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => storage.saveTask('one')).toThrow('quota');
    expect(storage.isTaskSaved('one')).toBe(false);
    expect(storage.savedTaskIds().size).toBe(0);
    setItem.mockRestore();
    logger.mockRestore();
  });
});

describe('stored settings and language', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('recovers from an unknown stored language and invalid fields', async () => {
    localStorage.setItem('advent_tram_settings', JSON.stringify({ language: 'xx', ageGroups: [1, 'nope'] }));
    const storage = TestBed.inject(StorageService);
    const settings = await storage.loadSettings();
    expect(settings.language).toBe('en');
    expect(settings.ageGroups).toEqual(['family']);
    expect(storage.language()).toBe('en');
  });

  it('recovers from corrupt JSON', async () => {
    localStorage.setItem('advent_tram_settings', '{not json');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const settings = await TestBed.inject(StorageService).loadSettings();
    expect(settings.language).toBe('en');
    consoleError.mockRestore();
  });

  it('ignores non-string ids in stored task state', async () => {
    localStorage.setItem('advent_tram_task_state', JSON.stringify({ saved: ['a', 7, null], completed: 'oops' }));
    const state = await TestBed.inject(StorageService).loadTaskState();
    expect([...state.saved]).toEqual(['a']);
    expect(state.completed.size).toBe(0);
  });

  it('sets <html lang> to a valid tag (ua becomes uk)', async () => {
    const storage = TestBed.inject(StorageService);
    await storage.saveSettings({ language: 'ua' as never, ageGroups: ['family'] });
    TestBed.tick();
    expect(document.documentElement.lang).toBe('uk');
  });
});

describe('data export and erase', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('exports settings, task state and calendar as JSON', async () => {
    const storage = TestBed.inject(StorageService);
    await storage.saveSettings({ language: 'pl' as never, ageGroups: ['adults'], adventStyle: 'classic' });
    await storage.loadTaskState();
    storage.saveTask('task_001');
    const data = JSON.parse(await storage.exportAll());
    expect(data.app).toBe('advent-tram');
    expect(data.settings.language).toBe('pl');
    expect(data.taskState.saved).toEqual(['task_001']);
    expect(Array.isArray(data.memories)).toBe(true);
  });

  it('erases settings and task state', async () => {
    const storage = TestBed.inject(StorageService);
    await storage.saveSettings({ language: 'de' as never, ageGroups: ['family'] });
    await storage.loadTaskState();
    storage.saveTask('x');
    await storage.clearAllData();
    expect(localStorage.getItem('advent_tram_settings')).toBeNull();
    expect(storage.savedTaskIds().size).toBe(0);
    expect(storage.language()).toBe('en');
  });
});

