import { Injectable } from '@angular/core';
import localForage from 'localforage';
import { AppSettings, DEFAULT_SETTINGS, FeedEntry, TaskState } from '../models';

const STORAGE_KEYS = {
  SETTINGS: 'advent_tram_settings',
  TASK_STATE: 'advent_tram_task_state',
  FEED_ENTRIES: 'advent_tram_feed_entries',
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

  private isLocalForageInitialized = false;

  constructor() {
    // Initialize localForage lazily (only when needed)
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
      return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  // ===== Task State Management (localStorage) =====

  async loadTaskState(): Promise<TaskState> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TASK_STATE);
      if (!stored) {
        return this.memoryTaskState;
      }

      const parsed = JSON.parse(stored);
      this.memoryTaskState = {
        rejected: new Set(parsed.rejected || []),
        saved: new Set(parsed.saved || []),
        postponed: new Set(parsed.postponed || []),
        completed: new Set(parsed.completed || []),
      };
      return this.memoryTaskState;
    } catch (error) {
      console.error('Error loading task state:', error);
      return this.memoryTaskState;
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
    }
  }

  rejectTask(taskId: string): void {
    this.memoryTaskState.rejected.add(taskId);
    this.saveTaskState();
  }

  saveTask(taskId: string): void {
    this.memoryTaskState.saved.add(taskId);
    this.memoryTaskState.postponed.delete(taskId);
    this.memoryTaskState.rejected.delete(taskId);
    this.saveTaskState();
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

  async deleteFeedEntry(entryId: string): Promise<void> {
    try {
      const entries = (await localForage.getItem<FeedEntry[]>(
        STORAGE_KEYS.FEED_ENTRIES
      )) || [];
      const filtered = entries.filter((e) => e.id !== entryId);
      await localForage.setItem(STORAGE_KEYS.FEED_ENTRIES, filtered);
    } catch (error) {
      console.error('Error deleting feed entry:', error);
    }
  }

  async clearAllData(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      localStorage.removeItem(STORAGE_KEYS.TASK_STATE);
      await localForage.removeItem(STORAGE_KEYS.FEED_ENTRIES);
      this.memoryTaskState = {
        rejected: new Set(),
        saved: new Set(),
        postponed: new Set(),
        completed: new Set(),
      };
    } catch (error) {
      console.error('Error clearing all data:', error);
    }
  }
}
