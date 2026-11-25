import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import type {
  AgeGroup,
  Duration,
  Language,
  Location,
  Task,
  TaskText,
} from '../models';

import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class TasksService {
  private http = inject(HttpClient);
  private storageService = inject(StorageService);

  private allTasks = signal<Task[]>([]);
  private isLoaded = signal(false);

  /** Translated texts of the current language (id -> texts); English lives in tasks.json itself. */
  private readonly texts = signal<Record<string, TaskText>>({});
  private textsLanguage: Language | null = null;

  constructor() {
    // One small file per language (assets/data/tasks.<lang>.json) keeps the download small as ideas grow.
    effect(() => {
      void this.loadTexts(this.storageService.language());
    });
  }

  /** Returns the task with text fields in the current app language (English fallback). */
  private localize(task: Task): Task {
    const text = this.texts()[task.id];
    return text ? { ...task, ...text } : task;
  }

  private async loadTexts(language: Language): Promise<void> {
    if (language === this.textsLanguage) return;
    this.textsLanguage = language;
    if (language === 'en') {
      this.texts.set({});
      return;
    }
    try {
      const texts = await firstValueFrom(this.http.get<Record<string, TaskText>>(`assets/data/tasks.${language}.json`));
      // ignore a stale response if the language changed again meanwhile
      if (this.textsLanguage === language) this.texts.set(texts ?? {});
    } catch (error) {
      console.warn(`No translated ideas for "${language}", showing English:`, error);
      if (this.textsLanguage === language) this.texts.set({});
    }
  }

  /**
   * Load all tasks from assets/data/tasks.json
   */
  async loadTasks(): Promise<void> {
    if (this.isLoaded()) {
      return;
    }

    try {
      const [tasks] = await Promise.all([
        firstValueFrom(this.http.get<Task[]>('assets/data/tasks.json')),
        this.loadTexts(this.storageService.language()),
      ]);

      if (tasks) {
        this.allTasks.set(tasks);
        this.isLoaded.set(true);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      throw error;
    }
  }

  /**
   * Get tasks not currently saved. Legacy rejected and completed IDs remain available.
   */
  getAvailableTasks(): Task[] {
    return this.allTasks()
      .filter((task) => !this.storageService.isTaskSaved(task.id))
      .map((task) => this.localize(task));
  }

  /**
   * Get saved (bookmarked) tasks
   */
  getSavedTasks(): Task[] {
    return this.allTasks()
      .filter((task) => this.storageService.isTaskSaved(task.id))
      .map((task) => this.localize(task));
  }

  /**
   * Get postponed tasks
   */
  getPostponedTasks(): Task[] {
    return this.allTasks()
      .filter((task) => this.storageService.isTaskPostponed(task.id))
      .map((task) => this.localize(task));
  }

  /**
   * Deck pool: every idea matching the filters except excluded / completed ones.
   * Saved (but unscheduled) ideas stay in the pool, at the very end of the queue.
   */
  filterTasks(options: {
    ageGroups?: AgeGroup[];
    location?: Location;
    duration?: Duration;
    exclude?: ReadonlySet<string>;
  }): Task[] {
    let filtered = this.allTasks().filter((task) =>
      !options.exclude?.has(task.id) && !this.storageService.isTaskCompleted(task.id));

    if (options.ageGroups && options.ageGroups.length > 0) {
      filtered = filtered.filter((task) =>
        task.ageGroups.some((ag) => options.ageGroups!.includes(ag))
      );
    }

    if (options.location) {
      filtered = filtered.filter((task) => task.location === options.location);
    }

    if (options.duration) {
      filtered = filtered.filter((task) =>
        options.duration === 60 ? task.duration >= 60 : task.duration === options.duration
      );
    }

    const isSaved = (task: Task): boolean => this.storageService.isTaskSaved(task.id);
    return [
      ...filtered.filter((task) => !isSaved(task)),
      ...filtered.filter(isSaved),
    ].map((task) => this.localize(task));
  }

  /**
   * Get a single task by ID
   */
  getTaskById(taskId: string): Task | undefined {
    const task = this.allTasks().find((t) => t.id === taskId);
    return task ? this.localize(task) : undefined;
  }

  /**
   * Get the next task from the queue (excluding rejected/completed)
   */
  getNextTask(options?: {
    ageGroups?: AgeGroup[];
    location?: Location;
    duration?: Duration;
  }): Task | undefined {
    const candidates = options
      ? this.filterTasks(options)
      : this.getAvailableTasks();

    return candidates.length > 0 ? candidates[0] : undefined;
  }

  /**
   * Mark task as rejected
   */
  rejectTask(taskId: string): void {
    this.storageService.rejectTask(taskId);
  }

  /**
   * Mark task as saved
   */
  saveTask(taskId: string): void {
    this.storageService.saveTask(taskId);
  }

  /**
   * Mark task as postponed
   */
  postponeTask(taskId: string): void {
    this.storageService.postponeTask(taskId);
  }

  /**
   * Mark task as completed
   */
  completeTask(taskId: string): void {
    this.storageService.completeTask(taskId);
  }

  /**
   * Get task state for a specific task
   */
  getTaskState(taskId: string): {
    isRejected: boolean;
    isSaved: boolean;
    isPostponed: boolean;
    isCompleted: boolean;
  } {
    return {
      isRejected: this.storageService.isTaskRejected(taskId),
      isSaved: this.storageService.isTaskSaved(taskId),
      isPostponed: this.storageService.isTaskPostponed(taskId),
      isCompleted: this.storageService.isTaskCompleted(taskId),
    };
  }

  /**
   * Get count of available tasks
   */
  getAvailableTaskCount(): number {
    return this.getAvailableTasks().length;
  }

  /**
   * Get count of saved tasks
   */
  getSavedTaskCount(): number {
    return this.getSavedTasks().length;
  }
}
