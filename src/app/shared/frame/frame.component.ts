import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import type { TranslationKey } from '../../core/i18n/en';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { StorageService } from '../../core/services';

interface Tab { path: string; label: TranslationKey; exact?: boolean }

const TABS: Tab[] = [
  { path: '/home', label: 'nav.home', exact: true },
  { path: '/adventure', label: 'nav.swipe' },
  { path: '/tram-route', label: 'route.title' },
  { path: '/saved', label: 'nav.saved' },
  { path: '/settings', label: 'home.settings' },
  { path: '/coffee', label: 'home.coffee' },
];

/**
 * Tablet / desktop page header: brand, tagline and the main tabs, with a divider underneath.
 * Hidden on phones, where each page keeps its own compact header.
 */
@Component({
  selector: 'app-frame-nav',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <header class="frame-head">
      <a class="brand" routerLink="/home">
        <span class="name">{{ 'onboarding.title' | translate: language() }}</span>
        <span class="tagline">{{ 'home.subtitle' | translate: language() }}</span>
      </a>
      <nav [attr.aria-label]="'onboarding.title' | translate: language()">
        <ul>
          @for (tab of tabs; track tab.path) {
            <li>
              <a [routerLink]="tab.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: !!tab.exact }">{{ tab.label | translate: language() }}</a>
            </li>
          }
        </ul>
      </nav>
    </header>
    <hr class="frame-rule" />
  `,
  styles: `
    :host { display: none; }
    @media (min-width: 600px) { :host { display: block; margin-bottom: 8px; } }
    .frame-head { display: flex; flex-direction: column; gap: 14px; }
    .brand { display: grid; gap: 4px; color: #2f2622; text-decoration: none; }
    .name { font: 700 32px/1.1 var(--font-display); letter-spacing: -.5px; }
    .tagline { color: #6b5f58; font-size: 14px; }
    nav { min-width: 0; }
    ul { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 4px; margin: 0; padding: 0; list-style: none; }
    li a {
      display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 clamp(10px, 2.2vw, 22px); border-radius: 24px;
      color: #7a1c2e; font: 700 15px 'Inter Variable', sans-serif; text-decoration: none; white-space: nowrap; transition: background .15s, color .15s;
    }
    li a.active { background: #1b4332; color: #fff; }
    @media (hover: hover) { li a:not(.active):hover { background: rgba(122, 28, 46, .08); } }
    li a:focus-visible, .brand:focus-visible { outline: 2px solid #7a1c2e; outline-offset: 2px; border-radius: 12px; }
    .frame-rule { height: 2px; margin: 14px 0 0; border: 0; background: #e3d9d2; }
    @media (min-width: 1024px) {
      .frame-head { flex-direction: row; align-items: center; justify-content: space-between; gap: 24px; }
      nav { flex: 1; }
      ul { justify-content: flex-end; gap: 6px; flex-wrap: nowrap; }
      li a { min-height: 44px; padding: 0 clamp(10px, 1.4vw, 20px); font-size: 14px; }
    }
  `,
})
export class FrameNavComponent {
  private readonly storage = inject(StorageService);
  readonly language = computed(() => this.storage.language());
  readonly tabs = TABS;
}

/** Small line at the bottom of every tablet / desktop page. */
@Component({
  selector: 'app-frame-footer',
  imports: [TranslatePipe],
  template: `<p>{{ 'app.footer' | translate: language() }}</p>`,
  styles: `
    :host { display: none; }
    @media (min-width: 600px) { :host { display: block; margin-top: 28px; } }
    p { margin: 0; color: #7a1c2e; font: 600 11px 'Inter Variable', sans-serif; letter-spacing: .08em; text-align: center; }
  `,
})
export class FrameFooterComponent {
  private readonly storage = inject(StorageService);
  readonly language = computed(() => this.storage.language());
}
