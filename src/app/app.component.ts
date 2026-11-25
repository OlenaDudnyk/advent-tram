import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

import { AppUpdateService, InstallService, NavigationHistoryService, SeoService, StorageService } from './core/services';
import { SnowBackdropComponent } from './shared/snow-backdrop/snow-backdrop.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, SnowBackdropComponent],
})
export class AppComponent {
  // Instantiate early so the in-app history is tracked from the first navigation.
  constructor() {
    inject(NavigationHistoryService);
    inject(SeoService);
    inject(AppUpdateService);
    inject(InstallService);
    // Apply the saved language (and <html lang>) before the first page renders.
    void inject(StorageService).loadSettings();
  }
}
