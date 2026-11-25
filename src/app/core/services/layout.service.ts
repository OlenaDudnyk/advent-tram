import { Injectable, signal } from '@angular/core';

/** Breakpoints shared with `theme/layout.scss`. */
export const TABLET_MIN = 600;
export const WIDE_MIN = 1024;

/** Reactive viewport class: tablet (≥600px) and wide (≥1024px: landscape tablet / desktop). */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly tablet = signal(false);
  readonly wide = signal(false);

  constructor() {
    this.watch(`(min-width: ${TABLET_MIN}px)`, this.tablet);
    this.watch(`(min-width: ${WIDE_MIN}px)`, this.wide);
  }

  private watch(query: string, target: { set(value: boolean): void }): void {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const list = window.matchMedia(query);
    target.set(list.matches);
    list.addEventListener('change', (event) => target.set(event.matches));
  }
}
