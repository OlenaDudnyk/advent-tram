import { Injectable, inject } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';

/**
 * Mirrors the in-app browser history (url stack) so "back" can return to the real previous page
 * and only fall back to a fixed route on a fresh load / deep link.
 */
@Injectable({ providedIn: 'root' })
export class NavigationHistoryService {
  private readonly router = inject(Router);
  private readonly stack: string[] = [];
  private pending: { trigger: string; replace: boolean } = { trigger: 'imperative', replace: false };

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.pending = {
          trigger: event.navigationTrigger ?? 'imperative',
          replace: this.router.getCurrentNavigation()?.extras.replaceUrl ?? false,
        };
      } else if (event instanceof NavigationEnd) {
        this.record(event.urlAfterRedirects);
      }
    });
  }

  /** True when there is an earlier in-app page to go back to. */
  get canGoBack(): boolean {
    return this.stack.length > 1;
  }

  private record(url: string): void {
    if (this.pending.trigger === 'popstate') {
      const index = this.stack.lastIndexOf(url, this.stack.length - 2);
      if (index >= 0) this.stack.length = index + 1;
      else this.stack.push(url);
    } else if (this.pending.replace && this.stack.length) {
      this.stack[this.stack.length - 1] = url;
    } else {
      this.stack.push(url);
    }
  }
}
