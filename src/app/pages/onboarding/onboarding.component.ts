import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonButton } from '@ionic/angular';
import { StorageService } from '../../core/services';
import { AppSettings, AgeGroup } from '../../core/models';

interface Translation {
  tagline: string;
  title: string;
  subtitle: string;
  ageGroupLabel: string;
  ageGroupDescription: string;
  kids3_6: string;
  kids7_12: string;
  adults: string;
  family: string;
  footerText: string;
  buttonText: string;
  selectAtLeastOne: string;
  selectLanguage: string;
}

const TRANSLATIONS: Record<'ua' | 'en', Translation> = {
  en: {
    tagline: 'A LITTLE WONDER, EVERY DAY',
    title: 'Advent Tram',
    subtitle: 'Your ticket to a slower, sweeter Christmas.',
    ageGroupLabel: "Who's riding?",
    ageGroupDescription: 'Make room for your favorite people.',
    kids3_6: 'Kids 3-6',
    kids7_12: 'Kids 7-12',
    adults: 'Adults',
    family: 'Whole Family',
    footerText: 'No rush. No perfect plans. Just being together.',
    buttonText: 'Board the Tram',
    selectAtLeastOne: 'Please select at least one age group',
    selectLanguage: 'Language',
  },
  ua: {
    tagline: 'ТРОХИ ЧУДА ЩОДНЯ',
    title: 'Advent Tram',
    subtitle: 'Ваш квиток до повільнішого, слідшого Різдва.',
    ageGroupLabel: 'Хто їде?',
    ageGroupDescription: 'Зроби місце для своїх близьких.',
    kids3_6: 'Діти 3-6',
    kids7_12: 'Діти 7-12',
    adults: 'Дорослі',
    family: 'Вся сім\'я',
    footerText: 'Без поспіху. Без ідеальних планів. Просто разом.',
    buttonText: 'Сісти в трамвай',
    selectAtLeastOne: 'Будь ласка, виберіть принаймні одну групу',
    selectLanguage: 'Мова',
  },
};

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonButton,
  ],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss'],
})
export class OnboardingComponent implements OnInit {
  private storageService = inject(StorageService);
  private router = inject(Router);

  // Signals
  language = signal<'ua' | 'en'>('en');
  selectedAgeGroups = signal<Set<AgeGroup>>(new Set(['family']));
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Computed translation
  t = computed(() => TRANSLATIONS[this.language()]);

  // Age group options
  ageGroupOptions = computed(() => [
    {
      id: 'kids_3_6' as const,
      label: this.t().kids3_6,
      color: 'evergreen',
    },
    {
      id: 'kids_7_12' as const,
      label: this.t().kids7_12,
      color: 'burgundy',
    },
    {
      id: 'adults' as const,
      label: this.t().adults,
      color: 'sand',
    },
    {
      id: 'family' as const,
      label: this.t().family,
      color: 'evergreen',
    },
  ]);

  ngOnInit(): void {
    this.loadSettings();
  }

  /**
   * Load existing settings if available
   */
  private async loadSettings(): Promise<void> {
    try {
      const settings = await this.storageService.loadSettings();
      this.language.set(settings.language);
      this.selectedAgeGroups.set(new Set(settings.ageGroups));
    } catch (err) {
      console.error('Failed to load settings:', err);
      // Use defaults (already set in signal initializers)
    }
  }

  /**
   * Toggle language between English and Ukrainian
   */
  toggleLanguage(lang: 'ua' | 'en'): void {
    this.language.set(lang);
  }

  /**
   * Toggle age group selection
   */
  toggleAgeGroup(ageGroup: AgeGroup): void {
    const current = new Set(this.selectedAgeGroups());

    if (current.has(ageGroup)) {
      // Only allow deselection if there's at least one other selected
      if (current.size > 1) {
        current.delete(ageGroup);
      }
    } else {
      current.add(ageGroup);
    }

    this.selectedAgeGroups.set(current);
    this.error.set(null);
  }

  /**
   * Check if an age group is selected
   */
  isAgeGroupSelected(ageGroup: AgeGroup): boolean {
    return this.selectedAgeGroups().has(ageGroup);
  }

  /**
   * Save settings and navigate to home
   */
  async onBoardTheTram(): Promise<void> {
    // Validate selection
    if (this.selectedAgeGroups().size === 0) {
      this.error.set(this.t().selectAtLeastOne);
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const settings: AppSettings = {
        language: this.language(),
        ageGroups: Array.from(this.selectedAgeGroups()),
      };

      await this.storageService.saveSettings(settings);

      // Navigate to home, replacing the onboarding route
      this.router.navigate(['/home'], { replaceUrl: true });
    } catch (err) {
      console.error('Failed to save settings:', err);
      this.error.set('Something went wrong. Please try again.');
      this.isLoading.set(false);
    }
  }
}
