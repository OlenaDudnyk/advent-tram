import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { Language } from '../../core/models';

/** Icon-only "Saved ideas" link with a numeric badge. Keeps a full accessible name and tooltip. */
@Component({
  selector: 'app-saved-link',
  imports: [RouterLink, TranslatePipe],
  template: `
    <a
      class="saved-link"
      routerLink="/saved"
      [queryParams]="params()"
      [attr.aria-label]="label()"
      [title]="'home.savedIdeas' | translate: language()"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 20S3 15 3 8.5a4.5 4.5 0 0 1 9-1 4.5 4.5 0 0 1 9 1C21 15 12 20 12 20Z" />
      </svg>
      <span class="badge" aria-hidden="true">{{ count() }}</span>
    </a>
  `,
  styles: `
    :host { display: inline-flex; }
    .saved-link { position: relative; display: grid; place-items: center; width: 44px; height: 44px; margin: -8px; color: #7a1c2e; border-radius: 50%; }
    .saved-link:active { background: rgba(122, 28, 46, .1); }
    svg { width: 23px; height: 23px; display: block; }
    .badge { position: absolute; top: 4px; right: 0; min-width: 16px; height: 16px; padding: 0 3px; box-sizing: border-box; display: grid; place-items: center; border-radius: 8px; background: #7a1c2e; color: #f7f0ec; font: 600 9px 'Inter Variable', sans-serif; }
  `,
})
export class SavedLinkComponent {
  readonly language = input.required<Language>();
  readonly count = input(0);
  readonly params = input<Record<string, string | number | null | undefined>>({ from: 'home' });
  readonly label = computed(() => `${new TranslatePipe().transform('home.savedIdeas', this.language())} (${this.count()})`);
}
