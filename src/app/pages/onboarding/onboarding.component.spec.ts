import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { Language } from '../../core/models';
import { StorageService } from '../../core/services';

import { OnboardingComponent } from './onboarding.component';

describe('OnboardingComponent language selection', () => {
  const storage = {
    loadSettings: vi.fn(),
    saveSettings: vi.fn(),
  };
  const router = { navigate: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    storage.loadSettings.mockResolvedValue({ language: Language.English, ageGroups: ['family'] });
    storage.saveSettings.mockResolvedValue(undefined);
    router.navigate.mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        { provide: StorageService, useValue: storage },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('switches all text and saves the selected language', async () => {
    const fixture = TestBed.createComponent(OnboardingComponent);
    fixture.detectChanges();
    await vi.waitFor(() => expect(storage.loadSettings).toHaveBeenCalled());
    await Promise.resolve();
    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('.age-group-label')?.textContent).toContain("Who's riding?");

    const buttons = html.querySelectorAll<HTMLButtonElement>('.toggle-segment');
    buttons[1].click();
    fixture.detectChanges();
    expect(html.querySelector('.age-group-label')?.textContent).toContain('Хто їде?');
    expect(html.querySelector('.age-group-btn')?.textContent).toContain('Діти 3-6');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');

    await fixture.componentInstance.onBoardTheTram();
    expect(storage.saveSettings).toHaveBeenCalledWith({
      language: Language.Ukrainian,
      ageGroups: ['family'],
    });
    expect(router.navigate).toHaveBeenCalledWith(['/home'], { replaceUrl: true });
  });

  it('restores a previously saved Ukrainian setting', async () => {
    storage.loadSettings.mockResolvedValue({ language: Language.Ukrainian, ageGroups: ['adults'] });
    const fixture = TestBed.createComponent(OnboardingComponent);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.language()).toBe(Language.Ukrainian));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.age-group-label')?.textContent).toContain('Хто їде?');
    expect(fixture.componentInstance.selectedAgeGroup()).toBe('adults');
  });
});
