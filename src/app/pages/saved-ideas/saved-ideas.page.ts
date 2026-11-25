import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonModal } from '@ionic/angular';

import type { TranslationKey } from '../../core/i18n/en';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { Language, Task } from '../../core/models';
import { DEFAULT_SETTINGS, illustrationFor } from '../../core/models';
import { StorageService, TasksService } from '../../core/services';
import { BackButtonComponent } from '../../shared/back-button/back-button.component';
import { FrameFooterComponent, FrameNavComponent } from '../../shared/frame/frame.component';
import { MemoryFormComponent } from '../memory-form/memory-form.component';

@Component({
  selector: 'app-saved-ideas',
  imports: [FrameNavComponent, FrameFooterComponent, IonContent, IonModal, TranslatePipe, MemoryFormComponent, BackButtonComponent],
  templateUrl: './saved-ideas.page.html',
  styleUrls: ['./saved-ideas.page.scss'],
})
export class SavedIdeasPage {
  private readonly storage = inject(StorageService);
  private readonly tasks = inject(TasksService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly language = signal<Language>(DEFAULT_SETTINGS.language);
  readonly ideas = signal<Task[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly missing = signal(false);
  readonly message = signal<TranslationKey | null>(null);
  readonly memoryTask = signal<Task | null>(null);
  readonly saving = signal(false);
  readonly backPath = signal('/home');
  readonly backParams = signal<Record<string, string>>({});

  async ionViewWillEnter(): Promise<void> {
    await this.loadIdeas();
  }

  async loadIdeas(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    this.missing.set(false);
    this.message.set(null);
    try {
      const [settings, state] = await Promise.all([
        this.storage.loadSettings(),
        this.storage.loadTaskState(),
        this.tasks.loadTasks(),
      ]);
      this.language.set(settings.language);
      const ideas = this.tasks.getSavedTasks();
      this.ideas.set(ideas);
      this.missing.set(ideas.length < state.saved.size);
      const params = this.route.snapshot.queryParamMap;
      const from = params.get('from');
      this.backPath.set(from === 'deck' ? '/adventure' : from === 'calendar' ? '/tram-route' : '/home');
      const backParams: Record<string, string> = {};
      if (from === 'deck') {
        for (const key of ['location', 'duration', 'day']) {
          const value = params.get(key);
          if (value) backParams[key] = value;
        }
      }
      this.backParams.set(backParams);
    } catch (error) {
      console.error('Unable to load saved ideas:', error);
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  artFor(task: Task): string {
    return illustrationFor(task);
  }

  async scheduleIdea(task: Task): Promise<void> {
    await this.router.navigate(['/tram-route'], { queryParams: { taskId: task.id } });
  }

  remove(task: Task): void {
    try {
      this.storage.removeSavedTask(task.id);
      this.ideas.set(this.tasks.getSavedTasks());
      this.message.set(null);
    } catch (error) {
      console.error('Unable to remove saved idea:', error);
      this.message.set('saved.saveError');
    }
  }

  finishMemory(task: Task): void {
    this.memoryTask.set(null);
    try {
      this.storage.markSavedTaskCompleted(task.id);
      this.message.set(null);
    } catch (error) {
      console.error('Unable to mark saved idea complete:', error);
      this.message.set('saved.saveError');
    }
  }
}
