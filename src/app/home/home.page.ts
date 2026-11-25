import type { OnInit} from '@angular/core';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent, IonModal, IonToast } from '@ionic/angular';

import { TranslatePipe } from '../core/i18n/translate.pipe';
import type { Duration, Language, Location, FeedEntry, Task } from '../core/models';
import { DEFAULT_SETTINGS, LOCALES } from '../core/models';
import { ShareService, StorageService, TasksService, isCalendarDate, parseCalendarDate } from '../core/services';
import { MemoryFormComponent } from '../pages/memory-form/memory-form.component';
import { FrameFooterComponent, FrameNavComponent } from '../shared/frame/frame.component';
import { SavedLinkComponent } from '../shared/saved-link/saved-link.component';


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [FrameNavComponent, FrameFooterComponent, IonContent, IonModal, IonToast, RouterLink, TranslatePipe, SavedLinkComponent, MemoryFormComponent],
})
export class HomePage implements OnInit {
  private readonly storage = inject(StorageService);
  private readonly tasks = inject(TasksService);
  private readonly shareService = inject(ShareService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly year = new Date().getFullYear();
  readonly language = signal<Language>(DEFAULT_SETTINGS.language);
  readonly entries = signal<FeedEntry[]>([]);
  readonly savedCount = signal(0);
  readonly tasksLoaded = signal(false);
  readonly editing = signal<FeedEntry | null>(null);
  readonly editBusy = signal(false);
  readonly toast = signal<string | null>(null);
  readonly filterOpen = signal(false);
  readonly location = signal<Location>('in');
  readonly duration = signal<Duration>(15);
  readonly calendarDay = signal<string | null>(null);
  readonly durations: Duration[] = [5, 15, 30, 60];
  private finding = false;

  openFilters(): void {
    this.filterOpen.set(true);
  }

  async findCards(modal: Pick<IonModal, 'dismiss'>): Promise<void> {
    const day = this.calendarDay();
    this.finding = true;
    try {
      await modal.dismiss();
      this.filterOpen.set(false);
      await this.router.navigate(['/adventure'], {
        queryParams: { location: this.location(), duration: this.duration(), ...(day ? { day } : {}) },
      });
    } finally {
      this.finding = false;
    }
  }

  async filterDismissed(): Promise<void> {
    this.filterOpen.set(false);
    if (!this.finding && this.calendarDay()) {
      this.calendarDay.set(null);
      await this.router.navigate([], { relativeTo: this.route, queryParams: { day: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
  }

  async ngOnInit(): Promise<void> {
    const [settings, state, entries] = await Promise.all([
      this.storage.loadSettings(),
      this.storage.loadTaskState(),
      this.storage.getFeedEntries(),
    ]);
    this.language.set(settings.language);
    this.savedCount.set(state.saved.size);
    this.entries.set(entries);

    try {
      await this.tasks.loadTasks();
      this.tasksLoaded.set(true);
    } catch (error) {
      console.error('Unable to load memory task details:', error);
    }
  }

  async ionViewWillEnter(): Promise<void> {
    const rawDay = this.route.snapshot.queryParamMap.get('day');
    this.calendarDay.set(rawDay && isCalendarDate(rawDay, new Date().getFullYear()) ? rawDay : null);
    if (this.calendarDay()) this.filterOpen.set(true);
    const [settings, state, entries] = await Promise.all([
      this.storage.loadSettings(), this.storage.loadTaskState(), this.storage.getFeedEntries(),
    ]);
    this.language.set(settings.language);
    this.savedCount.set(state.saved.size);
    this.entries.set(entries);
  }

  editTask(): Task {
    const entry = this.editing();
    return (entry && this.tasks.getTaskById(entry.taskId)) || ({ id: entry?.taskId ?? '' } as Task);
  }

  editEntry(entry: FeedEntry): void {
    this.editing.set(entry);
  }

  async editFinished(): Promise<void> {
    this.editing.set(null);
    this.entries.set(await this.storage.getFeedEntries());
    this.toast.set(new TranslatePipe().transform('memory.edited', this.language()));
  }

  async deleteFinished(): Promise<void> {
    this.editing.set(null);
    this.entries.set(await this.storage.getFeedEntries());
    this.toast.set(new TranslatePipe().transform('memory.deleted', this.language()));
  }

  async shareEntry(entry: FeedEntry): Promise<void> {
    const language = this.language();
    const result = await this.shareService.shareMemory({ ...entry, title: this.displayTitle(entry) }, language);
    const pipe = new TranslatePipe();
    if (result === 'copied') this.toast.set(pipe.transform('memory.copied', language));
    else if (result === 'failed') this.toast.set(pipe.transform('memory.shareFailed', language));
  }

  /** Entry title in the current language when its task is known; otherwise the stored title. */
  displayTitle(entry: FeedEntry): string {
    return this.taskFor(entry)?.title ?? entry.title;
  }

  taskFor(entry: FeedEntry): Task | undefined {
    return this.tasksLoaded() ? this.tasks.getTaskById(entry.taskId) : undefined;
  }

  calendarDateFor(day: string): string {
    return new Intl.DateTimeFormat(LOCALES[this.language()], {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(parseCalendarDate(day)!);
  }

  dateFor(date: string): string {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return date;
    }
    return new Intl.DateTimeFormat(LOCALES[this.language()], {
      day: '2-digit',
      month: 'long',
    }).format(parsed).toUpperCase();
  }
}
