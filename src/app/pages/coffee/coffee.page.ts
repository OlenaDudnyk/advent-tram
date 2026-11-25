import { Component, computed, inject, signal } from '@angular/core';
import { IonContent, IonToast } from '@ionic/angular';

import { COFFEE_TIERS, SUPPORT_LINKS } from '../../../environments/coffee';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { DEFAULT_SETTINGS, Language } from '../../core/models';
import { ShareService, StorageService } from '../../core/services';
import { BackButtonComponent } from '../../shared/back-button/back-button.component';
import { FrameFooterComponent, FrameNavComponent } from '../../shared/frame/frame.component';


@Component({
  selector: 'app-coffee',
  imports: [FrameNavComponent, FrameFooterComponent, IonContent, IonToast, TranslatePipe, BackButtonComponent],
  templateUrl: './coffee.page.html',
  styleUrls: ['./coffee.page.scss'],
})
export class CoffeePage {
  private readonly storage = inject(StorageService);
  private readonly shareService = inject(ShareService);

  readonly language = signal<Language>(DEFAULT_SETTINGS.language);
  readonly tiers = COFFEE_TIERS;
  readonly selectedTier = signal<(typeof COFFEE_TIERS)[number]['id']>('cappuccino');
  readonly toastOpen = signal(false);
  readonly selectedAmount = computed(() => this.tiers.find((t) => t.id === this.selectedTier())?.amount ?? 0);

  async ionViewWillEnter(): Promise<void> {
    this.language.set((await this.storage.loadSettings()).language);
  }

  /** Monobank jar for Ukrainian, PayPal.me (with the chosen € amount) for everyone else. */
  readonly provider = computed<'monobank' | 'paypal'>(() => {
    const hasPaypal = !!SUPPORT_LINKS.paypalMeUrl;
    const hasMonobank = !!SUPPORT_LINKS.monobankJarUrl;
    // Ukrainian -> Monobank jar; everyone else -> PayPal.me. A missing link falls back to the other one,
    // so the page works with just a Monobank jar (it accepts international Visa / Mastercard cards).
    if (this.language() === Language.Ukrainian) return hasMonobank || !hasPaypal ? 'monobank' : 'paypal';
    return hasPaypal || !hasMonobank ? 'paypal' : 'monobank';
  });
  readonly supportUrl = computed(() => {
    if (this.provider() === 'monobank') return SUPPORT_LINKS.monobankJarUrl || null;
    const base = SUPPORT_LINKS.paypalMeUrl.replace(/\/+$/, '');
    const tier = this.tiers.find((t) => t.id === this.selectedTier());
    return base && tier ? `${base}/${tier.amount}EUR` : null;
  });

  async shareApp(): Promise<void> {
    const text = new TranslatePipe().transform('coffee.shareText', this.language());
    const result = await this.shareService.share({ title: 'Advent Tram', text, url: window.location.origin });
    if (result === 'copied') this.toastOpen.set(true);
  }
}
