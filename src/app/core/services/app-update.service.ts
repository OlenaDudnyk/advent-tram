import { Injectable, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { ToastController } from '@ionic/angular';
import { filter } from 'rxjs';

import { TranslatePipe } from '../i18n/translate.pipe';

import { StorageService } from './storage.service';

/** Tells the user when a new version of the app has been downloaded and offers to reload. */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly updates = inject(SwUpdate);
  private readonly toasts = inject(ToastController);
  private readonly storage = inject(StorageService);

  constructor() {
    if (!this.updates.isEnabled) return;
    this.updates.versionUpdates
      .pipe(filter((event) => event.type === 'VERSION_READY'))
      .subscribe(() => void this.announce());
  }

  private async announce(): Promise<void> {
    const pipe = new TranslatePipe();
    const language = this.storage.language();
    const toast = await this.toasts.create({
      message: pipe.transform('update.available', language),
      position: 'bottom',
      buttons: [{
        text: pipe.transform('update.reload', language),
        handler: () => { void this.updates.activateUpdate().then(() => document.location.reload()); },
      }],
    });
    await toast.present();
  }
}
