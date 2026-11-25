import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonModal, NavController } from '@ionic/angular';

import type { TranslationKey } from '../../core/i18n/en';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { AdventStyle, AgeGroup, FeedEntry, Task } from '../../core/models';
import { DEFAULT_SETTINGS, LOCALES, Language, illustrationFor } from '../../core/models';
import {
  CalendarService, LayoutService, NavigationHistoryService, StorageService, TasksService,
  adventSundays, calendarDate, calendarDays, isCalendarDate, parseCalendarDate, sundayTask,
} from '../../core/services';
import { BackButtonComponent } from '../../shared/back-button/back-button.component';
import { FrameFooterComponent, FrameNavComponent } from '../../shared/frame/frame.component';
import { InspirationLinkComponent } from '../../shared/inspiration-link/inspiration-link.component';
import { MemoryFormComponent } from '../memory-form/memory-form.component';

/** Short weekday headers, Sunday first (church Advent weeks start with the candle Sunday). */
const WEEKDAYS_SUN_FIRST: Record<Language, string[]> = {
  [Language.English]: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  [Language.Ukrainian]: ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  [Language.Polish]: ['N', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'],
  [Language.Spanish]: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
  [Language.German]: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  [Language.French]: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
};

const AGE_LABELS: Record<AgeGroup, TranslationKey> = {
  kids_3_6: 'onboarding.kids3_6',
  kids_7_12: 'onboarding.kids7_12',
  adults: 'onboarding.adults',
  family: 'onboarding.family',
};

export interface CalendarCell {
  day: string;
  num: number;
  candle: boolean;
  completed: boolean;
  scheduled: boolean;
  magic: boolean;
  christmas: boolean;
  today: boolean;
  extra: number;
  /** Outside the Advent range or in another month: shown dimmed and not clickable. */
  muted: boolean;
}

@Component({
  selector: 'app-tram-route',
  imports: [FrameNavComponent, FrameFooterComponent, NgTemplateOutlet, IonContent, IonModal, TranslatePipe, MemoryFormComponent, BackButtonComponent, InspirationLinkComponent],
  templateUrl: './tram-route.page.html',
  styleUrls: ['./tram-route.page.scss'],
})
export class TramRoutePage {
  private readonly storage = inject(StorageService);
  private readonly tasks = inject(TasksService);
  private readonly calendar = inject(CalendarService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly nav = inject(NavController);
  private readonly history = inject(NavigationHistoryService);
  /** Landscape tablet / desktop: the day opens in a side panel instead of a bottom sheet. */
  readonly wide = inject(LayoutService).wide;
  private readonly dayModal = viewChild<IonModal>('dayModal');

  readonly language = signal<Language>(DEFAULT_SETTINGS.language);
  readonly year = signal(new Date().getFullYear());
  readonly sundays = computed(() => adventSundays(this.year()));
  readonly adventStyle = signal<AdventStyle>('church');
  private readonly ageGroup = signal<AgeGroup>('family');
  readonly ageLabelKey = computed<TranslationKey>(() => AGE_LABELS[this.ageGroup()]);
  readonly isChurch = computed(() => this.adventStyle() === 'church');
  readonly savedCount = computed(() => this.storage.savedTaskIds().size);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly message = signal<TranslationKey | null>(null);
  readonly saving = signal(false);

  /** Day whose modal is open. */
  readonly selectedDay = signal<string | null>(null);
  readonly mode = signal<'list' | 'memory'>('list');
  /** Idea whose memory is being added / edited. */
  readonly memoryTask = signal<Task | null>(null);
  private readonly entries = signal<FeedEntry[]>([]);

  /** Idea waiting for the user to pick its day (coming from Saved Ideas). */
  readonly pendingTask = signal<Task | null>(null);
  readonly confirmDay = signal<string | null>(null);
  /** Shown after an idea from Saved Ideas was scheduled. */
  readonly scheduledInfo = signal<{ day: string; task: Task } | null>(null);

  readonly dayTasks = computed(() => {
    const day = this.selectedDay();
    return day ? this.tasksForDay(day) : [];
  });
  readonly memoryEntry = computed(() => {
    const task = this.memoryTask();
    return task ? this.entries().find((entry) => entry.taskId === task.id) ?? null : null;
  });

  /**
   * church: from the first Advent Sunday to Christmas, in Sunday-first weeks (each row starts with a candle).
   * classic: the 25 windows Dec 1–25.
   */
  readonly adventDays = computed(() => {
    const year = this.year();
    if (this.isChurch()) return calendarDays(year).filter((day) => day <= `${year}-12-25`);
    return Array.from({ length: 25 }, (_, index) => `${year}-12-${String(index + 1).padStart(2, '0')}`);
  });
  readonly weekdayHeaders = computed(() => WEEKDAYS_SUN_FIRST[this.language()]);
  /** First and last day of the calendar (inclusive). */
  readonly range = computed<[string, string]>(() => {
    const year = this.year();
    return [this.isChurch() ? this.sundays()[0] : `${year}-12-01`, `${year}-12-25`];
  });
  /** Months shown on tablet and up: November (church Advent starting there) and December. */
  readonly months = computed<number[]>(() => {
    const start = parseCalendarDate(this.range()[0])!.getMonth();
    return start === 11 ? [11] : [start, 11];
  });
  readonly viewMonth = signal(11);
  readonly canPrev = computed(() => this.months().indexOf(this.viewMonth()) > 0);
  readonly canNext = computed(() => this.months().indexOf(this.viewMonth()) < this.months().length - 1);
  /** Tablet and up show a Monday-first month grid; phones keep the compact Advent grid. */
  readonly tablet = inject(LayoutService).tablet;
  readonly monthWeekdays = computed(() => {
    const formatter = new Intl.DateTimeFormat(LOCALES[this.language()], { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2024, 0, 1 + i, 12)).replace(/\.$/, '').toUpperCase());
  });

  private buildCell(day: string, today: string, muted: boolean): CalendarCell {
    const tasks = muted ? [] : this.tasksForDay(day);
    const planned = tasks.filter((task) => task.category !== 'sunday_silence');
    const done = tasks.length > 0 && tasks.every((task) => this.calendar.isCompleted(day, task.id));
    return {
      day,
      num: Number(day.slice(-2)),
      candle: !muted && this.isSunday(day),
      completed: done,
      scheduled: planned.length > 0,
      magic: planned.some((task) => task.category === 'heart_deed'),
      christmas: !muted && this.isChristmas(day),
      today: day === today,
      extra: Math.max(0, tasks.length - 1),
      muted,
    };
  }

  /** One view model per calendar cell (marker, state, extra-plans badge). */
  readonly cells = computed<CalendarCell[]>(() => {
    const today = calendarDate(new Date());
    if (!this.tablet()) return this.adventDays().map((day) => this.buildCell(day, today, false));
    const year = this.year();
    const month = this.viewMonth();
    const [from, to] = this.range();
    const lead = (new Date(year, month, 1, 12).getDay() + 6) % 7;
    const count = new Date(year, month + 1, 0, 12).getDate();
    const cells: CalendarCell[] = [];
    for (let i = lead; i > 0; i--) cells.push(this.buildCell(calendarDate(new Date(year, month, 1 - i, 12)), today, true));
    for (let d = 1; d <= count; d++) {
      const day = calendarDate(new Date(year, month, d, 12));
      cells.push(this.buildCell(day, today, day < from || day > to));
    }
    return cells;
  });

  prevMonth(): void {
    if (this.canPrev()) this.viewMonth.set(this.months()[this.months().indexOf(this.viewMonth()) - 1]);
  }

  nextMonth(): void {
    if (this.canNext()) this.viewMonth.set(this.months()[this.months().indexOf(this.viewMonth()) + 1]);
  }

  /** The first upcoming day that has something scheduled. */
  readonly nextStop = computed(() => {
    const today = calendarDate(new Date());
    for (const day of this.adventDays()) {
      if (day < today) continue;
      const ids = this.calendar.scheduled(day);
      const first = ids.map((id) => this.tasks.getTaskById(id)).find((task) => task !== undefined);
      if (first) return { day, title: first.title, count: ids.length };
    }
    return null;
  });

  /** "December 2026" */
  readonly monthTitle = computed(() => new Intl.DateTimeFormat(
    LOCALES[this.language()], { month: 'long', year: 'numeric' },
  ).format(new Date(this.year(), this.tablet() ? this.viewMonth() : 11, 1, 12)));
  readonly plansText = computed(() => {
    const stop = this.nextStop();
    if (!stop) return '';
    return this.translate(stop.count === 1 ? 'route.plansOne' : 'route.plansMany').replace('{n}', String(stop.count));
  });
  readonly nextStopDate = computed(() => {
    const stop = this.nextStop();
    return stop ? new Intl.DateTimeFormat(LOCALES[this.language()],
      { day: 'numeric', month: 'long' }).format(parseCalendarDate(stop.day)!).toUpperCase() : '';
  });

  readonly confirmText = computed(() => {
    const task = this.pendingTask();
    const day = this.confirmDay();
    return task && day ? `${task.title} — ${this.date(day)}` : '';
  });
  readonly scheduledText = computed(() => {
    const info = this.scheduledInfo();
    return info ? `${info.task.title} — ${this.date(info.day)}` : '';
  });

  async ionViewWillEnter(): Promise<void> {
    this.year.set(new Date().getFullYear());
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    this.message.set(null);
    try {
      const [settings, , , entries] = await Promise.all([
        this.storage.loadSettings(), this.storage.loadTaskState(), this.tasks.loadTasks(),
        this.storage.getFeedEntries(),
      ]);
      this.language.set(settings.language);
      this.adventStyle.set(settings.adventStyle ?? 'church');
      this.ageGroup.set(settings.ageGroups?.[0] ?? 'family');
      this.entries.set(entries);
      this.calendar.load();
      const taskId = this.route.snapshot.queryParamMap.get('taskId');
      const task = this.tasks.getSavedTasks().find((idea) => idea.id === taskId) ?? null;
      this.pendingTask.set(task);
      if (taskId && !task) this.message.set('route.invalidTask');

      // Wide screens show the day panel next to the calendar: start with today (or the first day).
      if (this.wide() && !this.selectedDay()) {
        const [from, to] = this.range();
        const today = calendarDate(new Date());
        const initial = today >= from && today <= to ? today : `${this.year()}-12-01`;
        this.viewMonth.set(parseCalendarDate(initial)!.getMonth());
        this.showDay(initial);
      }

      // Returning from the deck: reopen the day the idea was scheduled on.
      const dayParam = this.route.snapshot.queryParamMap.get('day');
      if (dayParam && isCalendarDate(dayParam, this.year())) {
        this.viewMonth.set(parseCalendarDate(dayParam)!.getMonth());
        this.showDay(dayParam);
        await this.router.navigate([], { relativeTo: this.route, queryParams: { day: null }, queryParamsHandling: 'merge', replaceUrl: true });
      }
    } catch (error) {
      console.error('Unable to load tram route:', error);
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  isSunday(day: string): boolean {
    return this.isChurch() && this.sundays().includes(day);
  }

  tasksForDay(day: string): Task[] {
    const tasks = this.isSunday(day) ? [sundayTask(Number(day.slice(-2)))] : [];
    for (const id of this.calendar.scheduled(day)) {
      const task = this.tasks.getTaskById(id);
      if (task) tasks.push(task);
    }
    return tasks;
  }

  hasMissing(day: string): boolean {
    return this.calendar.scheduled(day).some((id) => !this.tasks.getTaskById(id));
  }

  badge(day: string): string {
    return [...new Set(this.tasksForDay(day).map((task) =>
      task.category === 'sunday_silence' ? '🕯️' : task.category === 'heart_deed' ? '♥' : '★'))].join('');
  }

  /** Any date opens its day modal; from Saved Ideas it first asks to schedule the idea. */
  openDay(day: string): void {
    this.message.set(null);
    if (this.pendingTask()) {
      this.confirmDay.set(day);
      return;
    }
    this.showDay(day);
  }

  private showDay(day: string): void {
    this.selectedDay.set(day);
    this.mode.set('list');
    this.memoryTask.set(null);
  }

  closeDay(): void {
    this.selectedDay.set(null);
    this.mode.set('list');
    this.memoryTask.set(null);
    this.message.set(null);
  }

  /** "+ Add idea": pick an idea for this day in the swipe deck. */
  async addIdea(day: string): Promise<void> {
    await this.dayModal()?.dismiss();
    this.closeDay();
    await this.router.navigate(['/adventure'], { queryParams: { day } });
  }

  // ----- Saved Ideas -> calendar -----

  async confirmSchedule(): Promise<void> {
    const day = this.confirmDay();
    const task = this.pendingTask();
    this.confirmDay.set(null);
    if (!day || !task) return;
    try {
      this.calendar.schedule(day, task.id);
    } catch (error) {
      console.error('Unable to schedule idea:', error);
      this.message.set('route.saveError');
      return;
    }
    this.pendingTask.set(null);
    this.scheduledInfo.set({ day, task });
    await this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  cancelSchedule(): void {
    this.confirmDay.set(null);
  }

  async backToSaved(): Promise<void> {
    this.scheduledInfo.set(null);
    if (this.history.canGoBack) await this.nav.back();
    else await this.nav.navigateBack(['/saved']);
  }

  viewScheduledDay(): void {
    const info = this.scheduledInfo();
    this.scheduledInfo.set(null);
    if (info) this.showDay(info.day);
  }

  // ----- Day feed actions -----

  isCompleted(task: Task): boolean {
    const day = this.selectedDay();
    return day !== null && this.calendar.isCompleted(day, task.id);
  }

  isAllCompleted(day: string): boolean {
    const tasks = this.tasksForDay(day);
    return tasks.length > 0 && tasks.every((task) => this.calendar.isCompleted(day, task.id));
  }

  complete(task: Task): void {
    const day = this.selectedDay();
    if (!day) return;
    try {
      this.calendar.complete(day, task.id);
      this.message.set(null);
    } catch (error) {
      console.error('Unable to complete calendar task:', error);
      this.message.set('route.saveError');
    }
  }

  /** Takes the idea off this day; it returns to the deck pool. The Sunday candle cannot be removed. */
  remove(task: Task): void {
    const day = this.selectedDay();
    if (!day || !this.canRemove(task)) return;
    try {
      this.calendar.unschedule(day, task.id);
      this.message.set(null);
    } catch (error) {
      console.error('Unable to remove idea from the day:', error);
      this.message.set('route.saveError');
    }
  }

  canRemove(task: Task): boolean {
    return task.category !== 'sunday_silence';
  }

  hasMemory(task: Task): boolean {
    return this.entries().some((entry) => entry.taskId === task.id);
  }

  openMemory(task: Task): void {
    this.memoryTask.set(task);
    this.mode.set('memory');
    this.message.set(null);
  }

  async memoryDone(): Promise<void> {
    this.entries.set(await this.storage.getFeedEntries());
    this.mode.set('list');
    this.memoryTask.set(null);
  }

  // ----- Text helpers -----

  taskTitle(task: Task): string {
    return task.category === 'sunday_silence'
      ? this.translate('route.defaultTitle') : task.title;
  }

  taskDescription(task: Task): string {
    return task.category === 'sunday_silence'
      ? this.translate('route.defaultDescription') : task.fullDesc;
  }

  /** Reflection text only for ideas that carry one (candle days and heart deeds). */
  reflection(task: Task): string | null {
    if (task.category === 'sunday_silence') return this.translate('route.defaultReflection');
    if (!task.reflection) return null;
    return typeof task.reflection === 'string' ? task.reflection
      : task.reflection[this.language()] ?? task.reflection[Language.English] ?? null;
  }

  category(task: Task): TranslationKey {
    return task.category === 'sunday_silence' ? 'route.silence'
      : task.category === 'heart_deed' ? 'route.heart' : 'route.activity';
  }

  date(day: string): string {
    return new Intl.DateTimeFormat(LOCALES[this.language()],
      { weekday: 'long', day: 'numeric', month: 'long' }).format(parseCalendarDate(day)!).toUpperCase();
  }

  artFor(task: Task): string {
    return task.category === 'sunday_silence' ? 'assets/idea-candle.svg' : illustrationFor(task);
  }

  /** "December 12" / "12 грудня" */
  stopTitle(day: string): string {
    const locale = this.language() === Language.English ? 'en-US' : LOCALES[this.language()];
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(parseCalendarDate(day)!);
  }

  /** "2 IDEAS AT THIS STOP" */
  stopCount(count: number): string {
    return this.translate(count === 1 ? 'route.ideasAtStopOne' : 'route.ideasAtStop').replace('{n}', String(count));
  }

  /** "Stop: 5 December" */
  stopLabel(day: string): string {
    const formatted = new Intl.DateTimeFormat(LOCALES[this.language()],
      { day: 'numeric', month: 'long' }).format(parseCalendarDate(day)!);
    return this.translate('route.stop').replace('{date}', formatted);
  }

  isChristmas(day: string): boolean {
    return day.endsWith('-12-25');
  }

  dayNumber(day: string): number {
    return Number(day.slice(-2));
  }

  private translate(key: TranslationKey): string {
    return new TranslatePipe().transform(key, this.language());
  }
}
