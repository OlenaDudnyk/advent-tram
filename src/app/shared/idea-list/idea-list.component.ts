import { Component, computed, input } from '@angular/core';

import type { TranslationKey } from '../../core/i18n/en';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { IdeaList, Language } from '../../core/models';

const HEADINGS: Record<IdeaList['kind'], TranslationKey> = {
  music: 'list.music',
  film: 'list.film',
  book: 'list.book',
  recipe: 'list.recipe',
  links: 'list.links',
};

/** Recommendation list of an idea: songs, films, stories to read, or example links. */
@Component({
  selector: 'app-idea-list',
  imports: [TranslatePipe],
  template: `
    @if (list(); as l) {
      <section class="rec-list">
        <h3 class="title-label">{{ heading() | translate: language() }}</h3>
        <ul>
          @for (item of items(); track $index) {
            <li>
              @if (item.url) {
                <a [href]="item.url" target="_blank" rel="noopener noreferrer" (click)="$event.stopPropagation()">{{ item.text }} <span aria-hidden="true">↗</span></a>
              } @else {
                {{ item.text }}
              }
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    :host { display: block; }
    .rec-list { margin: 12px 4px 0; padding: 14px 16px; border-radius: 18px; background: #ebe2dc; }
    h3 { margin: 0 0 8px; color: #1b4332; }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 3px 0; color: #2f2622; font-size: 14px; line-height: 1.45; }
    a { color: #7a1c2e; font-weight: 600; text-decoration: none; }
    a:hover { text-decoration: underline; }
  `,
})
export class IdeaListComponent {
  readonly list = input<IdeaList | undefined>();
  readonly language = input.required<Language>();
  readonly heading = computed<TranslationKey>(() => HEADINGS[this.list()?.kind ?? 'links']);
  readonly items = computed(() => (this.list()?.items ?? []).map((item) =>
    typeof item === 'string' ? { text: item, url: null } : { text: item.text, url: safeUrl(item.url) }));
}

/** Only http(s) links are rendered. */
function safeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}
