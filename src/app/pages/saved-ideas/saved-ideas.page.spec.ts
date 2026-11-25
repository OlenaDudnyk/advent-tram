import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Language } from '../../core/models';
import { StorageService, TasksService } from '../../core/services';

import { SavedIdeasPage } from './saved-ideas.page';

describe('SavedIdeasPage', () => {
  const storage = {
    language: signal(Language.English),
    loadSettings: vi.fn(),
    loadTaskState: vi.fn(),
  };
  const tasks = {
    loadTasks: vi.fn(),
    getSavedTasks: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    storage.loadSettings.mockResolvedValue({ language: Language.English });
    storage.loadTaskState.mockResolvedValue({ saved: new Set(['one']) });
    tasks.loadTasks.mockResolvedValue(undefined);
    tasks.getSavedTasks.mockReturnValue([{
      id: 'one', title: 'A saved idea', fullDesc: 'A full description', duration: 15, location: 'in',
    }]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: StorageService, useValue: storage },
        { provide: TasksService, useValue: tasks },
      ],
    });
  });

  it('loads saved ideas and refreshes on re-entry', async () => {
    const fixture = TestBed.createComponent(SavedIdeasPage);
    await fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('A full description');

    storage.loadTaskState.mockResolvedValue({ saved: new Set() });
    tasks.getSavedTasks.mockReturnValue([]);
    await fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ideas you save will appear here.');
  });

  it('reports unavailable saved ideas and load failures', async () => {
    const fixture = TestBed.createComponent(SavedIdeasPage);
    tasks.getSavedTasks.mockReturnValue([]);
    await fixture.componentInstance.loadIdeas();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Some saved ideas are no longer available.');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    tasks.loadTasks.mockRejectedValue(new Error('offline'));
    await fixture.componentInstance.loadIdeas();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('Unable to load saved ideas');
    consoleError.mockRestore();
  });
});
