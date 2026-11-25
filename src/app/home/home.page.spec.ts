import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { Language } from '../core/models';
import { StorageService, TasksService } from '../core/services';

import { HomePage } from './home.page';

describe('HomePage', () => {
  const storage = {
    language: signal(Language.English),
    loadSettings: vi.fn(),
    loadTaskState: vi.fn(),
    getFeedEntries: vi.fn(),
  };
  const tasks = {
    loadTasks: vi.fn(),
    getTaskById: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    storage.loadSettings.mockResolvedValue({ language: Language.English, ageGroups: ['family'] });
    storage.loadTaskState.mockResolvedValue({ saved: new Set(['one', 'two']) });
    storage.getFeedEntries.mockResolvedValue([]);
    tasks.loadTasks.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: StorageService, useValue: storage },
        { provide: TasksService, useValue: tasks },
      ],
    });
  });

  it('shows the saved count and an empty state without fabricated memories', async () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.tasksLoaded()).toBe(true));
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;

    expect(html.querySelector('.saved-link .badge')?.textContent?.trim()).toBe('2');
    expect(html.querySelector('.empty-state')?.textContent).toContain('Your memories');
    expect(html.querySelectorAll('.memory-card')).toHaveLength(0);
    expect(html.querySelector('.saved-link')?.getAttribute('href')).toContain('/saved');
  });

  it('opens the filter and sends selected choices to the deck', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.new-idea')?.click();
    expect(fixture.componentInstance.filterOpen()).toBe(true);
    fixture.componentInstance.location.set('out');
    fixture.componentInstance.duration.set(30);
    await fixture.componentInstance.findCards({ dismiss: vi.fn().mockResolvedValue(true) });
    expect(navigate).toHaveBeenCalledWith(['/adventure'], {
      queryParams: { location: 'out', duration: 30 },
    });

    expect(fixture.componentInstance.filterOpen()).toBe(false);
  });

  it('refreshes the saved count when returning to home', async () => {
    const fixture = TestBed.createComponent(HomePage);
    storage.loadTaskState.mockResolvedValue({ saved: new Set(['one', 'two', 'three']) });
    await fixture.componentInstance.ionViewWillEnter();
    expect(fixture.componentInstance.savedCount()).toBe(3);
  });

  it('shows stored memories, task details and Ukrainian text', async () => {
    storage.loadSettings.mockResolvedValue({ language: Language.Ukrainian, ageGroups: ['family'] });
    storage.getFeedEntries.mockResolvedValue([{
      id: 'memory-1',
      taskId: 'task-1',
      title: 'Зірки',
      completedAt: '2025-12-03T12:00:00Z',
      photo: 'data:image/png;base64,abc',
      note: 'Разом',
    }]);
    tasks.getTaskById.mockReturnValue({ location: 'in', duration: 15 });

    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.tasksLoaded()).toBe(true));
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;

    expect(html.querySelector('h2')?.textContent).toContain('Наш Адвент');
    expect(html.querySelector('.memory-card h3')?.textContent).toBe('Зірки');
    expect(html.querySelector('.memory-note')?.textContent).toBe('Разом');
    expect(html.querySelector('.memory-meta')?.textContent).toContain('ВДОМА');
    expect(html.querySelector('.memory-duration')?.textContent).toContain('15 хв разом');
    expect(html.querySelector('.memory-photo')?.getAttribute('src')).toBe('data:image/png;base64,abc');
  });
});
