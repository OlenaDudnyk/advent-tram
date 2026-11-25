import { Component, HostListener, NgZone, ViewChild, computed, inject, signal } from '@angular/core';
import type { AfterViewInit, ElementRef, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, createAnimation, createGesture, IonContent } from '@ionic/angular';
import type { Animation, Gesture, GestureDetail } from '@ionic/angular';

import type { TranslationKey } from '../../core/i18n/en';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { AgeGroup, Duration, Language, Location, Task } from '../../core/models';
import { DEFAULT_SETTINGS, LOCALES, illustrationFor } from '../../core/models';
import { CalendarService, StorageService, TasksService, isCalendarDate, parseCalendarDate } from '../../core/services';
import { BackButtonComponent } from '../../shared/back-button/back-button.component';
import { FrameFooterComponent, FrameNavComponent } from '../../shared/frame/frame.component';
import { InspirationLinkComponent } from '../../shared/inspiration-link/inspiration-link.component';

const AGE_LABELS: Record<Task['ageGroups'][number], TranslationKey> = {
  kids_3_6: 'onboarding.kids3_6',
  kids_7_12: 'onboarding.kids7_12',
  adults: 'onboarding.adults',
  family: 'onboarding.family',
};

@Component({
  selector: 'app-swipe-deck',
  imports: [FrameNavComponent, FrameFooterComponent, IonContent, TranslatePipe, BackButtonComponent, InspirationLinkComponent],
  templateUrl: './swipe-deck.page.html',
  styleUrls: ['./swipe-deck.page.scss'],
})
export class SwipeDeckPage implements AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly storage = inject(StorageService);
  private readonly tasks = inject(TasksService);
  private readonly calendar = inject(CalendarService);
  private readonly zone = inject(NgZone);
  private readonly nav = inject(NavController);
  @ViewChild('deckShell', { static: true }) private readonly deckShell!: ElementRef<HTMLElement>;
  private gesture?: Gesture;
  private animation?: Animation;
  private entranceFrame?: number;
  private active = true;
  private suppressClickUntil = 0;
  private filterKey = '';

  readonly savedCount = computed(() => this.storage.savedTaskIds().size);
  readonly scheduledDay = signal<string | null>(null);
  readonly language = signal<Language>(DEFAULT_SETTINGS.language);
  readonly cards = signal<Task[]>([]);
  readonly index = signal(0);
  readonly current = computed(() => this.cards()[this.index()]);
  readonly dragX = signal(0);
  readonly dragging = signal(false);
  readonly animating = signal(false);
  readonly flipped = signal(false);
  readonly loading = signal(true);
  readonly error = signal<'deck.error' | 'deck.invalid' | null>(null);
  readonly ageLabels = AGE_LABELS;
  readonly ageGroup = signal<AgeGroup>('family');
  readonly routeLocation = (): string | null => this.route.snapshot.queryParamMap.get('location');
  readonly routeDuration = (): string | null => this.route.snapshot.queryParamMap.get('duration');

  async ionViewWillEnter(): Promise<void> {
    this.active = true;
    this.gesture?.enable(true);
    await this.loadCards();
  }

  ngAfterViewInit(): void {
    this.gesture = createGesture({
      el: this.deckShell.nativeElement,
      gestureName: 'adventure-card-swipe',
      direction: 'x',
      threshold: 8,
      canStart: (detail) => this.active && !!this.current() && !this.animating() &&
        // Only the inner card swipes, not the surrounding panel.
        detail.event.target instanceof Element && !!detail.event.target.closest('.card-wrap') &&
        !(detail.event.target instanceof Element && detail.event.target.closest('button, a')) &&
        !(detail.event instanceof MouseEvent && detail.event.button !== 0),
      onStart: () => this.zone.run(() => this.dragging.set(true)),
      onMove: (detail) => this.zone.run(() => this.dragX.set(detail.deltaX)),
      onEnd: (detail) => this.zone.run(() => this.endSwipe(detail)),
    });
    this.gesture.enable(this.active);
  }

  /** Desktop / keyboard: ← → browse the ideas. Ignored while typing or when a dialog is open. */
  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (!this.active || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('input, textarea, select, ion-modal')) return;
    this.step(event.key === 'ArrowRight' ? 1 : -1);
  }

  ionViewWillLeave(): void {
    this.active = false;
    this.gesture?.enable(false);
    this.resetSwipe();
  }

  ngOnDestroy(): void {
    this.active = false;
    this.gesture?.destroy();
    this.resetSwipe();
  }

  async loadCards(): Promise<void> {
    const previousId = this.current()?.id;
    this.resetSwipe();
    this.flipped.set(false);
    this.loading.set(true);
    this.error.set(null);
    const locationParam = this.route.snapshot.queryParamMap.get('location');
    const durationParam = this.route.snapshot.queryParamMap.get('duration');
    // Filters are optional (e.g. when picking an idea for a calendar day); if given they must be valid.
    const hasFilters = locationParam !== null || durationParam !== null;
    if (hasFilters && ((locationParam !== 'in' && locationParam !== 'out') ||
        (durationParam !== '5' && durationParam !== '15' && durationParam !== '30' && durationParam !== '60'))) {
      this.error.set('deck.invalid');
      this.loading.set(false);
      return;
    }
    const location = hasFilters ? (locationParam as Location) : undefined;
    const duration = hasFilters ? (Number(durationParam) as Duration) : undefined;
    try {
      const [settings] = await Promise.all([
        this.storage.loadSettings(),
        this.storage.loadTaskState(),
        this.tasks.loadTasks(),
      ]);
      this.language.set(settings.language);
      this.ageGroup.set(settings.ageGroups[0] ?? 'family');
      const dayParam = this.route.snapshot.queryParamMap.get('day');
      const day = dayParam;
      if (day !== null && !isCalendarDate(day, new Date().getFullYear())) {
        this.error.set('deck.invalid');
        return;
      }
      this.scheduledDay.set(day);
      this.calendar.load();
      // Ideas already planned (or done) on any day are not offered again.
      const exclude = new Set([...this.calendar.allScheduledIds(), ...this.calendar.allCompletedIds()]);
      const filtered = this.tasks.filterTasks({ location, duration, ageGroups: settings.ageGroups, exclude });
      const key = JSON.stringify([location ?? null, duration ?? null, settings.ageGroups, day]);
      if (key === this.filterKey) {
        const byId = new Map(filtered.map((task) => [task.id, task]));
        const remaining = this.cards().flatMap((card) => {
          const task = byId.get(card.id);
          if (!task) return [];
          byId.delete(card.id);
          return [task];
        });
        this.cards.set([...remaining, ...byId.values()]);
      } else {
        this.cards.set(filtered);
        this.filterKey = key;
      }
      this.index.set(Math.max(0, this.cards().findIndex((card) => card.id === previousId)));
    } catch (error) {
      console.error('Unable to load ideas:', error);
      this.error.set('deck.error');
    } finally {
      this.loading.set(false);
    }
  }

  private endSwipe(detail: GestureDetail): void {
    this.dragging.set(false);
    this.suppressClickUntil = performance.now() + 350;
    if (!this.active || detail.event?.type === 'touchcancel' || Math.abs(detail.deltaX) < 80) {
      this.dragX.set(0);
      return;
    }

    // Swipe left = next idea, swipe right = previous idea.
    const delta = detail.deltaX < 0 ? 1 : -1;
    if (!this.canMove(delta)) {
      this.dragX.set(0);
      return;
    }
    this.slide(delta, detail.deltaX);
  }

  /** The inner card element that is dragged and animated. */
  private cardEl(): HTMLElement | null {
    return this.deckShell.nativeElement.querySelector<HTMLElement>('.card-wrap');
  }

  /**
   * Slides the current card out, shows the next / previous one and slides it in from the other side.
   * Used by swipes (starting from the drag offset) and by the pager arrows (starting from rest).
   */
  private slide(delta: 1 | -1, startX: number): void {
    const el = this.cardEl();
    if (!el) {
      this.dragX.set(0);
      this.move(delta);
      return;
    }
    const distance = -delta * (window.innerWidth + el.offsetWidth);
    this.animating.set(true);
    const animation = createAnimation()
      .addElement(el)
      .duration(this.animationDuration(180))
      .easing('ease-in')
      .fromTo('transform', `translateX(${startX}px)`, `translateX(${distance}px)`)
      .fromTo('opacity', '1', '0');
    this.playAnimation(animation, () => {
      animation.destroy();
      this.animation = undefined;
      el.style.opacity = '0';
      this.dragX.set(0);
      this.move(delta);
      this.entranceFrame = requestAnimationFrame(() => this.zone.run(() => this.enterCard(distance)));
    });
  }

  private enterCard(distance: number): void {
    this.entranceFrame = undefined;
    const el = this.cardEl();
    if (!el) {
      this.resetSwipe();
      return;
    }
    const animation = createAnimation()
      .addElement(el)
      .duration(this.animationDuration(220))
      .easing('ease-out')
      .fromTo('transform', `translateX(${-distance}px)`, 'translateX(0px)')
      .fromTo('opacity', '0', '1');
    this.playAnimation(animation, () => this.resetSwipe());
  }

  private playAnimation(animation: Animation, onFinish: () => void): void {
    this.animation = animation;
    void animation.play().then(() => this.zone.run(() => {
      if (this.active && this.animation === animation) onFinish();
    })).catch((error: unknown) => this.zone.run(() => {
      console.error('Unable to animate the card:', error);
      if (this.animation === animation) this.resetSwipe();
    }));
  }

  private animationDuration(duration: number): number {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : duration;
  }

  private resetSwipe(): void {
    if (this.entranceFrame !== undefined) cancelAnimationFrame(this.entranceFrame);
    this.entranceFrame = undefined;
    this.animation?.destroy();
    this.animation = undefined;
    this.cardEl()?.style.removeProperty('opacity');
    this.animating.set(false);
    this.dragX.set(0);
    this.dragging.set(false);
  }

  readonly isSaved = computed(() => {
    const card = this.current();
    return !!card && this.storage.savedTaskIds().has(card.id);
  });
  readonly position = computed(() => this.translate('route.ideaCounter')
    .replace('{n}', String(this.index() + 1)).replace('{total}', String(this.cards().length)));

  artFor(task: Task): string {
    return illustrationFor(task);
  }

  /** "06 / 24" */
  readonly counter = computed(() => `${String(this.index() + 1).padStart(2, '0')} / ${String(this.cards().length).padStart(2, '0')}`);

  canMove(delta: 1 | -1): boolean {
    const next = this.index() + delta;
    return next >= 0 && next < this.cards().length;
  }

  /** Browse to the next / previous idea (pager buttons). */
  step(delta: 1 | -1): void {
    if (this.animating() || !this.canMove(delta)) return;
    this.resetSwipe();
    this.slide(delta, 0);
  }

  /** Date label for the "Schedule for …" button. */
  readonly dayLabel = computed(() => {
    const day = this.scheduledDay();
    const date = day ? parseCalendarDate(day) : null;
    return date ? new Intl.DateTimeFormat(LOCALES[this.language()],
      { day: 'numeric', month: 'long' }).format(date) : '';
  });

  /** Schedules the current idea on the target day and returns to that day's modal. */
  async scheduleHere(): Promise<void> {
    const card = this.current();
    const day = this.scheduledDay();
    if (!card || day === null || this.animating()) return;
    try {
      this.calendar.schedule(day, card.id);
    } catch (error) {
      console.error('Unable to schedule idea:', error);
      this.error.set('deck.error');
      return;
    }
    await this.nav.navigateBack(['/tram-route'], { queryParams: { day } });
  }

  /** Heart on the card: add the idea to Saved (and the chosen day), or remove it again. */
  toggleSaved(): void {
    const card = this.current();
    if (!card || this.animating()) return;
    try {
      if (this.isSaved()) {
        this.storage.removeSavedTask(card.id);
      } else {
        this.tasks.saveTask(card.id);
      }
    } catch (error) {
      console.error('Unable to update saved idea:', error);
      this.error.set('deck.error');
    }
  }

  flipCard(event: Event): void {
    if (this.animating() || this.dragging() ||
        (event instanceof MouseEvent && event.detail !== 0 && performance.now() < this.suppressClickUntil)) return;
    this.flipped.update((flipped) => !flipped);
  }

  private move(delta: 1 | -1): void {
    this.index.update((index) => index + delta);
    this.flipped.set(false);
  }

  private translate(key: TranslationKey): string {
    return new TranslatePipe().transform(key, this.language());
  }
}
