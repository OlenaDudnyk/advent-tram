import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';

import { NavigationHistoryService } from '../../core/services';

/** Header back arrow. Goes back to the actual previous page (falls back to `path` on a fresh load) with Ionic's reverse transition. */
@Component({
  selector: 'app-back-button',
  template: `<a class="back-button" [href]="href()" [attr.aria-label]="label()" (click)="go($event)">←</a>`,
  styles: `
    :host { display: inline-flex; }
    .back-button { display: grid; place-items: center; width: 44px; height: 44px; margin: -10px 0 -10px -10px; border-radius: 50%; color: #7a1c2e; font-size: 24px; line-height: 1; text-decoration: none; }
    .back-button:active { background: rgba(122, 28, 46, .1); }
  `,
})
export class BackButtonComponent {
  private readonly nav = inject(NavController);
  private readonly router = inject(Router);
  private readonly history = inject(NavigationHistoryService);

  readonly path = input('/home');
  readonly queryParams = input<Record<string, string | number | null | undefined>>({});
  readonly label = input.required<string>();
  readonly href = computed(() => this.router.serializeUrl(
    this.router.createUrlTree([this.path()], { queryParams: this.queryParams() })));

  go(event: Event): void {
    event.preventDefault();
    if (this.history.canGoBack) {
      // Real previous page: pop the browser history so the back animation matches.
      void this.nav.back();
    } else {
      void this.nav.navigateBack([this.path()], { queryParams: this.queryParams() });
    }
  }
}
