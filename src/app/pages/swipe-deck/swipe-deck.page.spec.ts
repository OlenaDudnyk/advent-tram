import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { NavController } from '@ionic/angular';

import { Language } from '../../core/models';
import { CalendarService, StorageService, TasksService } from '../../core/services';

import { SwipeDeckPage } from './swipe-deck.page';

describe('SwipeDeckPage', () => {
  const storage = {
    loadSettings: vi.fn(),
    loadTaskState: vi.fn(),
    savedTaskIds: signal<ReadonlySet<string>>(new Set()),
    removeSavedTask: vi.fn(),
  };
  const tasks = {
    loadTasks: vi.fn(),
    filterTasks: vi.fn(),
    saveTask: vi.fn(),
  };
  const calendar = { load: vi.fn(), schedule: vi.fn(), allScheduledIds: vi.fn(), allCompletedIds: vi.fn() };
  const route = { snapshot: { queryParamMap: convertToParamMap({ location: 'in', duration: '15' }) } };

  beforeEach(() => {
    vi.resetAllMocks();
    storage.savedTaskIds.set(new Set());
    calendar.allScheduledIds.mockReturnValue(new Set(['planned']));
    calendar.allCompletedIds.mockReturnValue(new Set(['done']));
    route.snapshot.queryParamMap = convertToParamMap({ location: 'in', duration: '15' });
    storage.loadSettings.mockResolvedValue({ language: Language.English, ageGroups: ['family'] });
    storage.loadTaskState.mockResolvedValue({});
    tasks.loadTasks.mockResolvedValue(undefined);
    tasks.filterTasks.mockReturnValue([
      { id: 'five', duration: 5 },
      { id: 'fifteen', duration: 15 },
      { id: 'thirty', duration: 30 },
      { id: 'hour', duration: 60 },
    ]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: StorageService, useValue: storage },
        { provide: TasksService, useValue: tasks },
        { provide: CalendarService, useValue: calendar },
      ],
    });
  });

  it('filters by location, age and exact time and browses forward and back', async () => {
    tasks.filterTasks.mockReturnValue([
      { id: 'five', duration: 15 },
      { id: 'fifteen', duration: 15 },
    ]);
    const page = TestBed.createComponent(SwipeDeckPage).componentInstance;
    await page.loadCards();
    expect(tasks.filterTasks).toHaveBeenCalledWith({ location: 'in', duration: 15, ageGroups: ['family'], exclude: new Set(['planned', 'done']) });
    expect(page.cards().map((card) => card.id)).toEqual(['five', 'fifteen']);
    expect(page.canMove(-1)).toBe(false);
    page.step(1);
    expect(page.current()?.id).toBe('fifteen');
    expect(page.canMove(1)).toBe(false);
    page.step(1);
    expect(page.current()?.id).toBe('fifteen');
    page.step(-1);
    expect(page.current()?.id).toBe('five');
    expect(tasks.saveTask).not.toHaveBeenCalled();
  });

  it('treats 1h+ as at least 60 minutes', async () => {
    route.snapshot.queryParamMap = convertToParamMap({ location: 'out', duration: '60' });
    tasks.filterTasks.mockReturnValue([{ id: 'hour', duration: 60 }]);
    const page = TestBed.createComponent(SwipeDeckPage).componentInstance;
    await page.loadCards();
    expect(tasks.filterTasks).toHaveBeenCalledWith({ location: 'out', duration: 60, ageGroups: ['family'], exclude: new Set(['planned', 'done']) });
    expect(page.cards().map((card) => card.id)).toEqual(['hour']);
  });

  it('shows invalid filters and load failures', async () => {
    const page = TestBed.createComponent(SwipeDeckPage).componentInstance;
    route.snapshot.queryParamMap = convertToParamMap({ location: 'other', duration: '15' });
    await page.loadCards();
    expect(page.error()).toBe('deck.invalid');
    route.snapshot.queryParamMap = convertToParamMap({ location: 'in', duration: '15' });
    tasks.loadTasks.mockRejectedValue(new Error('offline'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    await page.loadCards();
    expect(page.error()).toBe('deck.error');
    consoleError.mockRestore();
  });

  it('ignores browsing and saving while a swipe animation is running', async () => {
    const page = TestBed.createComponent(SwipeDeckPage).componentInstance;
    await page.loadCards();
    page.animating.set(true);
    page.step(1);
    page.toggleSaved();
    expect(page.index()).toBe(0);
    expect(tasks.saveTask).not.toHaveBeenCalled();
  });

  it('reloads filters when returning to the deck', async () => {
    const page = TestBed.createComponent(SwipeDeckPage).componentInstance;
    await page.ionViewWillEnter();
    page.flipped.set(true);
    route.snapshot.queryParamMap = convertToParamMap({ location: 'out', duration: '30' });
    await page.ionViewWillEnter();
    expect(tasks.filterTasks).toHaveBeenLastCalledWith({ location: 'out', duration: 30, ageGroups: ['family'], exclude: new Set(['planned', 'done']) });
    expect(page.index()).toBe(0);
    expect(page.flipped()).toBe(false);
  });

  it('resets the flipped side when browsing', async () => {
    const page = TestBed.createComponent(SwipeDeckPage).componentInstance;
    await page.loadCards();
    page.flipCard(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(page.flipped()).toBe(true);
    page.step(1);
    expect(page.current()?.id).toBe('fifteen');
    expect(page.flipped()).toBe(false);
  });

  it('saves with the heart without leaving the card, and removes it on a second tap', async () => {
    const page = TestBed.createComponent(SwipeDeckPage).componentInstance;
    await page.loadCards();
    page.toggleSaved();
    expect(tasks.saveTask).toHaveBeenCalledWith('five');
    expect(page.current()?.id).toBe('five');
    storage.savedTaskIds.set(new Set(['five']));
    expect(page.isSaved()).toBe(true);
    page.toggleSaved();
    expect(storage.removeSavedTask).toHaveBeenCalledWith('five');
  });

  it('works without filters when opened for a calendar day, and hearting does not schedule', async () => {
    const day = `${new Date().getFullYear()}-12-06`;
    route.snapshot.queryParamMap = convertToParamMap({ day });
    const page = TestBed.createComponent(SwipeDeckPage).componentInstance;
    await page.loadCards();
    expect(page.error()).toBeNull();
    expect(tasks.filterTasks).toHaveBeenCalledWith(expect.objectContaining({ location: undefined, duration: undefined }));
    expect(page.scheduledDay()).toBe(day);
    page.toggleSaved();
    expect(tasks.saveTask).toHaveBeenCalledWith('five');
    expect(calendar.schedule).not.toHaveBeenCalled();
  });

  it('schedules the current card on the target day with the CTA', async () => {
    const day = `${new Date().getFullYear()}-12-06`;
    route.snapshot.queryParamMap = convertToParamMap({ day });
    const page = TestBed.createComponent(SwipeDeckPage).componentInstance;
    await page.loadCards();
    const back = vi.spyOn(TestBed.inject(NavController), 'navigateBack').mockResolvedValue(true);
    page.step(1);
    await page.scheduleHere();
    expect(calendar.schedule).toHaveBeenCalledWith(day, 'fifteen');
    expect(back).toHaveBeenCalledWith(['/tram-route'], { queryParams: { day } });
  });
});
