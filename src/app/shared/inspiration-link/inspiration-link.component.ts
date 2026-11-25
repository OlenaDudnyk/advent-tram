import { Component, computed, input } from '@angular/core';

import type { TranslationKey } from '../../core/i18n/en';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { InspirationType, Language, Task } from '../../core/models';

/** Detects the platform from the link's host. */
export function detectInspirationType(url: string): InspirationType {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('pinterest')) return 'pinterest';
    if (host.includes('youtube') || host === 'youtu.be') return 'youtube';
  } catch {
    // fall through to the generic type
  }
  return 'link';
}

const LABELS: Record<InspirationType, TranslationKey> = {
  pinterest: 'inspiration.pinterest',
  youtube: 'inspiration.youtube',
  link: 'inspiration.link',
};

/** Small pill linking to optional inspiration (Pinterest ideas, a YouTube tutorial or any page). */
@Component({
  selector: 'app-inspiration-link',
  imports: [TranslatePipe],
  template: `
    @if (href(); as url) {
      <a
        class="pill"
        [href]="url"
        target="_blank"
        rel="noopener noreferrer"
        [attr.tabindex]="tabbable() ? null : -1"
        (click)="$event.stopPropagation()"
        (keydown.enter)="$event.stopPropagation()"
        (keydown.space)="$event.stopPropagation()"
      >
        <span class="badge" [class]="type()" aria-hidden="true">
          @switch (type()) {
            @case ('pinterest') {
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.2 3C7.600 3 5.300 6.100 5.300 8.800c0 1.600.6 3 1.900 3.500.2.100.4 0 .5-.2l.2-.8c.1-.2 0-.3-.1-.5-.4-.4-.6-1-.6-1.800 0-2.300 1.700-4.300 4.500-4.300 2.500 0 3.800 1.500 3.800 3.600 0 2.700-1.200 5-3 5-1 0-1.700-.8-1.500-1.800.3-1.200.8-2.400.8-3.200 0-.7-.4-1.300-1.200-1.300-1 0-1.700 1-1.700 2.400 0 .9.3 1.500.3 1.500l-1.200 5c-.3 1.500 0 3.400 0 3.600 0 .1.200.2.300.1.100-.2 1.500-1.900 2-3.600l.7-2.800c.4.700 1.400 1.300 2.500 1.300 3.200 0 5.300-2.900 5.300-6.800C18.800 5.700 16.300 3 12.200 3Z"/></svg>
            }
            @case ('youtube') {
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 7.500v9l8-4.500-8-4.500Z"/></svg>
            }
            @default {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c.8 4.200 1.800 5.200 6 6-4.200.8-5.200 1.800-6 6-.8-4.200-1.800-5.200-6-6 4.200-.8 5.200-1.800 6-6Zm7 11v4m-2-2h4"/></svg>
            }
          }
        </span>
        <span class="label">{{ label() | translate: language() }}</span>
        <span class="arrow" aria-hidden="true">↗</span>
      </a>
    }
  `,
  styles: `
    :host { display: block; margin: 14px 0; }
    .pill {
      display: inline-flex; align-items: center; gap: 10px; box-sizing: border-box; max-width: 100%;
      min-height: 44px; padding: 5px 16px 5px 6px;
      border: 1.5px solid #d4c5bd; border-radius: 24px; background: #fffaf6;
      color: #7a1c2e; font: 600 12px 'Inter Variable', sans-serif; text-decoration: none;
      box-shadow: 0 3px 0 rgba(122, 28, 46, .08); transition: transform .1s;
    }
    .pill:active { transform: translateY(2px); }
    .pill:focus-visible { outline: 2px solid #7a1c2e; outline-offset: 2px; }
    .badge { display: grid; place-items: center; flex: none; width: 32px; height: 32px; border-radius: 50%; background: #7a1c2e; color: #f7f0ec; }
    .badge.youtube { background: #1b4332; }
    .badge.link { background: #dfe9df; color: #1b4332; }
    .badge svg { width: 18px; height: 18px; }
    .arrow { color: #6b5f58; }
  `,
})
export class InspirationLinkComponent {
  readonly task = input.required<Pick<Task, 'inspirationUrl' | 'inspirationType'>>();
  readonly language = input.required<Language>();
  /** False when the link sits on a hidden (flipped-away) card face so it is skipped by Tab. */
  readonly tabbable = input(true);

  /** Only http(s) links are rendered. */
  readonly href = computed(() => {
    const url = this.task().inspirationUrl;
    if (!url) return null;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
    } catch {
      return null;
    }
  });
  readonly type = computed<InspirationType>(() => {
    const task = this.task();
    return task.inspirationType ?? detectInspirationType(task.inspirationUrl ?? '');
  });
  readonly label = computed(() => LABELS[this.type()]);
}
