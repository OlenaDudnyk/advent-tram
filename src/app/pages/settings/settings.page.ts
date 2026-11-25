import type { OnInit } from '@angular/core';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonModal } from '@ionic/angular';

import type { TranslationKey } from '../../core/i18n/en';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { AdventStyle, AgeGroup, AppSettings, Language } from '../../core/models';
import { DEFAULT_SETTINGS, LANGUAGE_NAMES } from '../../core/models';
import { InstallService, StorageService } from '../../core/services';
import { BackButtonComponent } from '../../shared/back-button/back-button.component';
import { FrameFooterComponent, FrameNavComponent } from '../../shared/frame/frame.component';
import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher.component';

@Component({
  selector: 'app-settings',
  imports: [FrameNavComponent, FrameFooterComponent, IonContent, IonModal, RouterLink, TranslatePipe, BackButtonComponent, LanguageSwitcherComponent],
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);
  readonly installer = inject(InstallService);

  readonly language = signal<Language>(DEFAULT_SETTINGS.language);
  readonly languageName = computed(() => LANGUAGE_NAMES[this.language()]);
  readonly ageGroups = signal<AgeGroup[]>([...DEFAULT_SETTINGS.ageGroups]);
  readonly adventStyle = signal<AdventStyle>('church');
  readonly adventOptions: { id: AdventStyle; titleKey: TranslationKey; hintKey: TranslationKey }[] = [
    { id: 'church', titleKey: 'settings.adventChurch', hintKey: 'settings.adventChurchHint' },
    { id: 'classic', titleKey: 'settings.adventClassic', hintKey: 'settings.adventClassicHint' },
  ];
  readonly confirmDelete = signal(false);
  readonly message = signal<TranslationKey | null>(null);
  readonly isError = signal(false);

  readonly ageGroupOptions: { id: AgeGroup; labelKey: TranslationKey }[] = [
    { id: 'kids_3_6', labelKey: 'onboarding.kids3_6' },
    { id: 'kids_7_12', labelKey: 'onboarding.kids7_12' },
    { id: 'adults', labelKey: 'onboarding.adults' },
    { id: 'family', labelKey: 'onboarding.family' },
  ];

  async ngOnInit(): Promise<void> {
    await this.refresh();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.refresh();
  }

  private async refresh(): Promise<void> {
    const settings = await this.storage.loadSettings();
    this.language.set(settings.language);
    this.adventStyle.set(settings.adventStyle ?? DEFAULT_SETTINGS.adventStyle ?? 'church');
    this.ageGroups.set(settings.ageGroups?.length ? [...settings.ageGroups] : [...DEFAULT_SETTINGS.ageGroups]);
  }

  async setLanguage(language: Language): Promise<void> {
    if (language === this.language()) return;
    const previous = this.language();
    this.language.set(language);
    if (!(await this.persist())) this.language.set(previous);
  }

  async toggleAgeGroup(group: AgeGroup): Promise<void> {
    const current = this.ageGroups();
    if (current.includes(group)) {
      if (current.length === 1) {
        this.isError.set(false);
        this.message.set('settings.keepOne');
        return;
      }
      await this.updateAgeGroups(current.filter((g) => g !== group));
    } else {
      await this.updateAgeGroups([...current, group]);
    }
  }

  async setAdventStyle(style: AdventStyle): Promise<void> {
    if (style === this.adventStyle()) return;
    const previous = this.adventStyle();
    this.adventStyle.set(style);
    if (!(await this.persist())) this.adventStyle.set(previous);
  }

  /** Saves a JSON copy of everything stored on this device. */
  async exportData(): Promise<void> {
    try {
      const blob = new Blob([await this.storage.exportAll()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `advent-tram-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.isError.set(false);
      this.message.set('settings.saved');
    } catch (error) {
      console.error('Unable to export data:', error);
      this.isError.set(true);
      this.message.set('settings.saveError');
    }
  }

  /** Erases all saved data from this device and starts over with onboarding. */
  async deleteAll(): Promise<void> {
    this.confirmDelete.set(false);
    try {
      await this.storage.clearAllData();
      await this.router.navigate(['/onboarding'], { replaceUrl: true });
    } catch (error) {
      console.error('Unable to delete data:', error);
      this.isError.set(true);
      this.message.set('settings.saveError');
    }
  }

  /** Everything is saved as you change it; this confirms it (the tablet / web design has a Save button). */
  async savePreferences(): Promise<void> {
    await this.persist();
  }

  isSelected(group: AgeGroup): boolean {
    return this.ageGroups().includes(group);
  }

  private async updateAgeGroups(groups: AgeGroup[]): Promise<void> {
    const previous = this.ageGroups();
    this.ageGroups.set(groups);
    if (!(await this.persist())) this.ageGroups.set(previous);
  }

  private async persist(): Promise<boolean> {
    const settings: AppSettings = { language: this.language(), ageGroups: this.ageGroups(), adventStyle: this.adventStyle() };
    try {
      await this.storage.saveSettings(settings);
      this.isError.set(false);
      this.message.set('settings.saved');
      return true;
    } catch (error) {
      console.error('Unable to save settings:', error);
      this.isError.set(true);
      this.message.set('settings.saveError');
      return false;
    }
  }
}
