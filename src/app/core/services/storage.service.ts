import { Injectable, effect, signal } from '@angular/core';
import localForage from 'localforage';

import type { AppSettings, FeedEntry, Language, TaskState } from '../models';
import { DEFAULT_SETTINGS, LANGUAGE_TAGS, sanitizeSettings } from '../models';

const STORAGE_KEYS = {
  SETTINGS: 'advent_tram_settings',
  TASK_STATE: 'advent_tram_task_state',
  FEED_ENTRIES: 'advent_tram_feed_entries',
  CALENDAR: 'advent_tram_calendar',
  LEGACY_CALENDAR: 'advent_tram_calendar_2026_12',
} as const;

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private memoryTaskState: TaskState = {
    rejected: new Set(),
    saved: new Set(),
    postponed: new Set(),
    completed: new Set(),
  };
  /** Current app language, kept in sync with saved settings so content can be localized anywhere. */
  readonly language = signal<Language>(DEFAULT_SETTINGS.language);
  readonly savedTaskIds = signal<ReadonlySet<string>>(new Set());
  /** Latest edited feed entry, so open views can react to edits. */
  readonly feedEntryUpdated = signal<FeedEntry | null>(null);

  private isLocalForageInitialized = false;

  constructor() {
    // Keep <html lang> in sync with the app language (screen readers, browser translation, SEO).
    effect(() => {
      if (typeof document !== 'undefined') document.documentElement.lang = LANGUAGE_TAGS[this.language()];
    });
  }

  private initializeLocalForage(): void {
    if (this.isLocalForageInitialized) {
      return;
    }

    try {
      localForage.config({
        name: 'advent-tram-db',
        version: 1.0,
        storeName: 'memories',
        driver: [
          localForage.INDEXEDDB,
          localForage.WEBSQL,
          localForage.LOCALSTORAGE,
        ],
      });
      this.isLocalForageInitialized = true;
    } catch (error) {
      console.warn('LocalForage config failed:', error);
      // Gracefully continue - localStorage will still work
    }
  }

  // ===== Settings Management (localStorage) =====

  async loadSettings(): Promise<AppSettings> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const settings = stored ? sanitizeSettings(JSON.parse(stored)) : { ...DEFAULT_SETTINGS };
      this.language.set(settings.language);
      return settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      this.language.set(settings.language);
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  // ===== Task State Management (localStorage) =====

  async loadTaskState(): Promise<TaskState> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TASK_STATE);
      if (!stored) {
        return this.memoryTaskState;
      }

      const parsed: unknown = JSON.parse(stored);
      const ids = (key: string): Set<string> => {
        const list = parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>)[key] : undefined;
        return new Set(Array.isArray(list) ? list.filter((id): id is string => typeof id === 'string') : []);
      };
      this.memoryTaskState = {
        rejected: ids('rejected'),
        saved: ids('saved'),
        postponed: ids('postponed'),
        completed: ids('completed'),
      };
      this.savedTaskIds.set(new Set(this.memoryTaskState.saved));
      return this.memoryTaskState;
    } catch (error) {
      console.error('Error loading task state:', error);
      throw error;
    }
  }

  private saveTaskState(): void {
    try {
      const state = {
        rejected: Array.from(this.memoryTaskState.rejected),
        saved: Array.from(this.memoryTaskState.saved),
        postponed: Array.from(this.memoryTaskState.postponed),
        completed: Array.from(this.memoryTaskState.completed),
      };
      localStorage.setItem(STORAGE_KEYS.TASK_STATE, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving task state:', error);
      throw error;
    }
  }

  rejectTask(taskId: string): void {
    this.memoryTaskState.rejected.add(taskId);
    this.saveTaskState();
  }

  saveTask(taskId: string): void {
    const previous = {
      rejected: new Set(this.memoryTaskState.rejected),
      saved: new Set(this.memoryTaskState.saved),
      postponed: new Set(this.memoryTaskState.postponed),
      completed: new Set(this.memoryTaskState.completed),
    };
    this.memoryTaskState.saved.add(taskId);
    this.memoryTaskState.postponed.delete(taskId);
    this.memoryTaskState.rejected.delete(taskId);
    try {
      this.saveTaskState();
      this.savedTaskIds.set(new Set(this.memoryTaskState.saved));
    } catch (error) {
      this.memoryTaskState = previous;
      throw error;
    }
  }

  removeSavedTask(taskId: string): void {
    if (!this.memoryTaskState.saved.has(taskId)) return;
    this.memoryTaskState.saved.delete(taskId);
    try {
      this.saveTaskState();
      this.savedTaskIds.set(new Set(this.memoryTaskState.saved));
    } catch (error) {
      this.memoryTaskState.saved.add(taskId);
      throw error;
    }
  }

  markSavedTaskCompleted(taskId: string): void {
    if (this.memoryTaskState.completed.has(taskId)) return;
    this.memoryTaskState.completed.add(taskId);
    try {
      this.saveTaskState();
    } catch (error) {
      this.memoryTaskState.completed.delete(taskId);
      throw error;
    }
  }
  postponeTask(taskId: string): void {
    this.memoryTaskState.postponed.add(taskId);
    this.memoryTaskState.rejected.delete(taskId);
    this.saveTaskState();
  }

  completeTask(taskId: string): void {
    this.memoryTaskState.completed.add(taskId);
    this.memoryTaskState.saved.delete(taskId);
    this.memoryTaskState.postponed.delete(taskId);
    this.saveTaskState();
    this.savedTaskIds.set(new Set(this.memoryTaskState.saved));
  }

  isTaskRejected(taskId: string): boolean {
    return this.memoryTaskState.rejected.has(taskId);
  }

  isTaskSaved(taskId: string): boolean {
    return this.memoryTaskState.saved.has(taskId);
  }

  isTaskPostponed(taskId: string): boolean {
    return this.memoryTaskState.postponed.has(taskId);
  }

  isTaskCompleted(taskId: string): boolean {
    return this.memoryTaskState.completed.has(taskId);
  }

  loadCalendar(): unknown {
    const stored = localStorage.getItem(STORAGE_KEYS.CALENDAR);
    return stored === null ? null : JSON.parse(stored);
  }

  loadLegacyCalendar(): unknown {
    const stored = localStorage.getItem(STORAGE_KEYS.LEGACY_CALENDAR);
    return stored === null ? null : JSON.parse(stored);
  }

  saveCalendar(state: unknown): void {
    localStorage.setItem(STORAGE_KEYS.CALENDAR, JSON.stringify(state));
  }

  // ===== Feed Entries Management (IndexedDB via localForage) =====

  async saveFeedEntry(entry: FeedEntry): Promise<void> {
    try {
      const entries = (await localForage.getItem<FeedEntry[]>(
        STORAGE_KEYS.FEED_ENTRIES
      )) || [];
      entries.push(entry);
      await localForage.setItem(STORAGE_KEYS.FEED_ENTRIES, entries);
    } catch (error) {
      console.error('Error saving feed entry:', error);
      throw error;
    }
  }

  async getFeedEntries(): Promise<FeedEntry[]> {
    try {
      const entries = (await localForage.getItem<FeedEntry[]>(
        STORAGE_KEYS.FEED_ENTRIES
      )) || [];
      return entries.sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
    } catch (error) {
      console.error('Error retrieving feed entries:', error);
      return [];
    }
  }

  async updateFeedEntry(
    entryId: string,
    changes: Partial<Pick<FeedEntry, 'note' | 'photo'>>,
  ): Promise<FeedEntry> {
    const entries = (await localForage.getItem<FeedEntry[]>(STORAGE_KEYS.FEED_ENTRIES)) || [];
    const index = entries.findIndex((e) => e.id === entryId);
    if (index === -1) throw new Error(`Feed entry ${entryId} not found`);
    const updated: FeedEntry = { ...entries[index], ...changes, editedAt: new Date().toISOString() };
    entries[index] = updated;
    await localForage.setItem(STORAGE_KEYS.FEED_ENTRIES, entries);
    this.feedEntryUpdated.set(updated);
    return updated;
  }

  async deleteFeedEntry(entryId: string): Promise<void> {
    try {
      const entries = (await localForage.getItem<FeedEntry[]>(
        STORAGE_KEYS.FEED_ENTRIES
      )) || [];
      const filtered = entries.filter((e) => e.id !== entryId);
      await localForage.setItem(STORAGE_KEYS.FEED_ENTRIES, filtered);
    } catch (error) {
      console.error('Error deleting feed entry:', error);
      throw error;
    }
  }

  /** Everything the app keeps on this device, as a JSON string (for the "Export my data" backup). */
  async exportAll(): Promise<string> {
    const entries = await this.getFeedEntries();
    return JSON.stringify({
      app: 'advent-tram',
      exportedAt: new Date().toISOString(),
      settings: await this.loadSettings(),
      taskState: {
        saved: [...this.memoryTaskState.saved],
        completed: [...this.memoryTaskState.completed],
        postponed: [...this.memoryTaskState.postponed],
        rejected: [...this.memoryTaskState.rejected],
      },
      calendar: this.loadCalendar(),
      memories: entries,
    }, null, 2);
  }

  async clearAllData(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      localStorage.removeItem(STORAGE_KEYS.TASK_STATE);
      localStorage.removeItem(STORAGE_KEYS.CALENDAR);
      localStorage.removeItem(STORAGE_KEYS.LEGACY_CALENDAR);
      await localForage.removeItem(STORAGE_KEYS.FEED_ENTRIES);
      this.memoryTaskState = {
        rejected: new Set(),
        saved: new Set(),
        postponed: new Set(),
        completed: new Set(),
      };
      this.savedTaskIds.set(new Set());
      this.language.set(DEFAULT_SETTINGS.language);
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }
}
