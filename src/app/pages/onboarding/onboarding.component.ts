import { CommonModule } from '@angular/common';
import type { OnInit} from '@angular/core';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonButton } from '@ionic/angular';

import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { AppSettings, AgeGroup, Language } from '../../core/models';
import { DEFAULT_SETTINGS } from '../../core/models';
import { StorageService } from '../../core/services';
import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher.component';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [
    CommonModule,
    LanguageSwitcherComponent,
    IonContent,
    IonButton,
    TranslatePipe,
  ],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss'],
})
export class OnboardingComponent implements OnInit {
  private storageService = inject(StorageService);
  private router = inject(Router);

  // Signals
  language = signal<Language>(DEFAULT_SETTINGS.language);
  selectedAgeGroup = signal<AgeGroup>('family');
  isLoading = signal(false);
  error = signal(false);

  readonly ageGroupOptions = [
    { id: 'kids_3_6', labelKey: 'onboarding.kids3_6' },
    { id: 'kids_7_12', labelKey: 'onboarding.kids7_12' },
    { id: 'adults', labelKey: 'onboarding.adults' },
    { id: 'family', labelKey: 'onboarding.family' },
  ] as const;

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
      // Select the first age group from saved settings, or keep default 'family'
      if (settings.ageGroups && settings.ageGroups.length > 0) {
        this.selectedAgeGroup.set(settings.ageGroups[0]);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      // Use defaults (already set in signal initializers)
    }
  }

  /**
   * Select an age group (radio button behavior - single select)
   */
  selectAgeGroup(ageGroup: AgeGroup): void {
    this.selectedAgeGroup.set(ageGroup);
    this.error.set(false);
  }

  /**
   * Check if an age group is selected
   */
  isAgeGroupSelected(ageGroup: AgeGroup): boolean {
    return this.selectedAgeGroup() === ageGroup;
  }

  /**
   * Save settings and navigate to home
   */
  async onBoardTheTram(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(false);

    try {
      const settings: AppSettings = {
        ...(await this.storageService.loadSettings()),
        language: this.language(),
        ageGroups: [this.selectedAgeGroup()],
      };

      await this.storageService.saveSettings(settings);

      // Navigate to home, replacing the onboarding route
      this.router.navigate(['/home'], { replaceUrl: true });
    } catch (err) {
      console.error('Failed to save settings:', err);
      this.error.set(true);
      this.isLoading.set(false);
    }
  }
}
