import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  AgeGroup,
  Duration,
  Location,
  Task,
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

  /**
   * Load all tasks from assets/data/tasks.json
   */
  async loadTasks(): Promise<void> {
    if (this.isLoaded()) {
      return;
    }

    try {
      const tasks = await this.http
        .get<Task[]>('/assets/data/tasks.json')
        .toPromise();

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
   * Get all available tasks (not rejected or completed)
   */
  getAvailableTasks(): Task[] {
    return this.allTasks().filter(
      (task) =>
        !this.storageService.isTaskRejected(task.id) &&
        !this.storageService.isTaskCompleted(task.id)
    );
  }

  /**
   * Get saved (bookmarked) tasks
   */
  getSavedTasks(): Task[] {
    return this.allTasks().filter((task) =>
      this.storageService.isTaskSaved(task.id)
    );
  }

  /**
   * Get postponed tasks
   */
  getPostponedTasks(): Task[] {
    return this.allTasks().filter((task) =>
      this.storageService.isTaskPostponed(task.id)
    );
  }

  /**
   * Filter available tasks by age groups, location, and/or duration
   */
  filterTasks(options: {
    ageGroups?: AgeGroup[];
    location?: Location;
    duration?: Duration;
  }): Task[] {
    let filtered = this.getAvailableTasks();

    if (options.ageGroups && options.ageGroups.length > 0) {
      filtered = filtered.filter((task) =>
        task.ageGroups.some((ag) => options.ageGroups!.includes(ag))
      );
    }

    if (options.location) {
      filtered = filtered.filter((task) => task.location === options.location);
    }

    if (options.duration) {
      filtered = filtered.filter((task) => task.duration === options.duration);
    }

    return filtered;
  }

  /**
   * Get a single task by ID
   */
  getTaskById(taskId: string): Task | undefined {
    return this.allTasks().find((task) => task.id === taskId);
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
