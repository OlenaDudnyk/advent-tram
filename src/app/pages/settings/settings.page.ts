import type { OnInit } from '@angular/core';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';

import type { TranslationKey } from '../../core/i18n/en';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { AdventStyle, AgeGroup, AppSettings, Language } from '../../core/models';
import { DEFAULT_SETTINGS, LANGUAGE_NAMES } from '../../core/models';
import { StorageService } from '../../core/services';
import { BackButtonComponent } from '../../shared/back-button/back-button.component';
import { FrameFooterComponent, FrameNavComponent } from '../../shared/frame/frame.component';
import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher.component';

@Component({
  selector: 'app-settings',
  imports: [FrameNavComponent, FrameFooterComponent, IonContent, RouterLink, TranslatePipe, BackButtonComponent, LanguageSwitcherComponent],
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {
  private readonly storage = inject(StorageService);

  readonly language = signal<Language>(DEFAULT_SETTINGS.language);
  readonly languageName = computed(() => LANGUAGE_NAMES[this.language()]);
  readonly ageGroups = signal<AgeGroup[]>([this.getInitialAgeGroup(DEFAULT_SETTINGS.ageGroups)]);
  readonly selectedAgeGroup = computed<AgeGroup>(() => this.ageGroups()[0] ?? this.getInitialAgeGroup(DEFAULT_SETTINGS.ageGroups));
  readonly adventStyle = signal<AdventStyle>('church');
  readonly adventOptions: { id: AdventStyle; titleKey: TranslationKey; hintKey: TranslationKey }[] = [
    { id: 'church', titleKey: 'settings.adventChurch', hintKey: 'settings.adventChurchHint' },
    { id: 'classic', titleKey: 'settings.adventClassic', hintKey: 'settings.adventClassicHint' },
  ];
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
    this.ageGroups.set([this.getInitialAgeGroup(settings.ageGroups)]);
  }

  async setLanguage(language: Language): Promise<void> {
    if (language === this.language()) return;
    const previous = this.language();
    this.language.set(language);
    if (!(await this.persist())) this.language.set(previous);
  }

  async selectAgeGroup(group: AgeGroup): Promise<void> {
    if (this.selectedAgeGroup() === group) return;
    await this.updateAgeGroups([group]);
  }

  async toggleAgeGroup(group: AgeGroup): Promise<void> {
    await this.selectAgeGroup(group);
  }

  async setAdventStyle(style: AdventStyle): Promise<void> {
    if (style === this.adventStyle()) return;
    const previous = this.adventStyle();
    this.adventStyle.set(style);
    if (!(await this.persist())) this.adventStyle.set(previous);
  }

  /** Everything is saved as you change it; this confirms it (the tablet / web design has a Save button). */
  async savePreferences(): Promise<void> {
    await this.persist();
  }

  isSelected(group: AgeGroup): boolean {
    return this.selectedAgeGroup() === group;
  }

  private getInitialAgeGroup(groups?: AgeGroup[]): AgeGroup {
    return groups?.[0] ?? DEFAULT_SETTINGS.ageGroups[0] ?? 'family';
  }

  private async updateAgeGroups(groups: AgeGroup[]): Promise<void> {
    const singleGroup: AgeGroup[] = [this.getInitialAgeGroup(groups)];
    const previous = this.ageGroups();
    this.ageGroups.set(singleGroup);
    if (!(await this.persist())) this.ageGroups.set(previous);
  }

  private async persist(): Promise<boolean> {
    const settings: AppSettings = {
      language: this.language(),
      ageGroups: [this.selectedAgeGroup()],
      adventStyle: this.adventStyle(),
    };
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
