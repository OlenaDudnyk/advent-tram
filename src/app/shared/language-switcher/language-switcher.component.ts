import { Component, input, model } from '@angular/core';

import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { Language } from '../../core/models';
import { LANGUAGE_OPTIONS } from '../../core/models';

/** Language switcher (EN, УК, PL, ES, DE, FR), shared by onboarding and settings. Two-way bindable: `[(language)]`. */
@Component({
  selector: 'app-language-switcher',
  imports: [TranslatePipe],
  template: `
    <div class="language-toggle" [class.pills]="variant() === 'pills'" role="group" [attr.aria-label]="'onboarding.selectLanguage' | translate: language()">
      @for (option of options; track option.value) {
        <button
          class="toggle-segment"
          type="button"
          [class.active]="language() === option.value"
          [attr.aria-pressed]="language() === option.value"
          [disabled]="disabled()"
          (click)="language.set(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
  styles: `
    :host { display: flex; justify-content: center; }
    .language-toggle { display: flex; gap: 4px; padding: 4px; border-radius: 19px; background: #ebe2dc; box-shadow: 0 2px 8px rgba(0, 0, 0, .08); }
    .toggle-segment {
      display: flex; align-items: center; justify-content: center;
      flex: 1; min-width: 40px; height: 38px; padding: 0 10px;
      border: 0; border-radius: 16px; background: transparent; color: #2c2c2c;
      font: 600 11px 'Inter Variable', sans-serif; letter-spacing: .3px; text-transform: uppercase;
      cursor: pointer; transition: background .2s, color .2s;
    }
    .toggle-segment:hover:not(.active):not(:disabled) { background: rgba(27, 67, 50, .08); color: #1b4332; }
    .toggle-segment.active { background: #1b4332; color: #f7f0ec; font-weight: 700; box-shadow: 0 2px 8px rgba(27, 67, 50, .2); }
    .toggle-segment:focus-visible { outline: 2px solid #7a1c2e; outline-offset: 2px; }
    .language-toggle.pills { flex-wrap: wrap; gap: 12px; padding: 0; border-radius: 0; background: none; box-shadow: none; width: 100%; }
    .pills .toggle-segment { flex: 1 1 calc(33.333% - 12px); height: 62px; border-radius: 31px; background: #ebe2dc; font-size: 17px; font-weight: 700; letter-spacing: 0; }
    .pills .toggle-segment.active { background: #1b4332; color: #fff; box-shadow: none; }
    @media (min-width: 600px) {
      .language-toggle.pills { gap: 12px; }
      .pills .toggle-segment { flex: 0 0 auto; min-width: 64px; height: 44px; padding: 0 22px; border-radius: 22px; font-size: 15px; color: #7a1c2e; }
      .pills .toggle-segment.active { color: #fff; }
    }
    .toggle-segment:disabled { opacity: .6; cursor: default; }
  `,
})
export class LanguageSwitcherComponent {
  readonly language = model.required<Language>();
  readonly disabled = input(false);
  /** segmented: compact control (onboarding). pills: large separate pills (settings). */
  readonly variant = input<'segmented' | 'pills'>('segmented');
  readonly options = LANGUAGE_OPTIONS;
}
