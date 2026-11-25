import { Component, inject, signal } from '@angular/core';
import { IonContent } from '@ionic/angular';

import type { TranslationKey } from '../../core/i18n/en';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { DEFAULT_SETTINGS } from '../../core/models';
import type { Language } from '../../core/models';
import { StorageService } from '../../core/services';
import { BackButtonComponent } from '../../shared/back-button/back-button.component';
import { FrameFooterComponent, FrameNavComponent } from '../../shared/frame/frame.component';

@Component({
  selector: 'app-privacy',
  imports: [FrameNavComponent, FrameFooterComponent, IonContent, TranslatePipe, BackButtonComponent],
  templateUrl: './privacy.page.html',
  styleUrls: ['./privacy.page.scss'],
})
export class PrivacyPage {
  private readonly storage = inject(StorageService);

  readonly language = signal<Language>(DEFAULT_SETTINGS.language);
  readonly sections: { title: TranslationKey; text: TranslationKey }[] = [
    { title: 'privacy.localTitle', text: 'privacy.local' },
    { title: 'privacy.photosTitle', text: 'privacy.photos' },
    { title: 'privacy.thirdTitle', text: 'privacy.third' },
    { title: 'privacy.deleteTitle', text: 'privacy.delete' },
  ];

  async ionViewWillEnter(): Promise<void> {
    this.language.set((await this.storage.loadSettings()).language);
  }
}
