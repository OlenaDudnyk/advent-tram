import { Injectable, signal } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Captures the browser's "install app" prompt so Settings can offer an Install button. */
@Injectable({ providedIn: 'root' })
export class InstallService {
  private deferred: BeforeInstallPromptEvent | null = null;
  readonly canInstall = signal(false);

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferred = event as BeforeInstallPromptEvent;
      this.canInstall.set(true);
    });
    window.addEventListener('appinstalled', () => {
      this.deferred = null;
      this.canInstall.set(false);
    });
  }

  /** Shows the install dialog; resolves true when the user accepted. */
  async install(): Promise<boolean> {
    const event = this.deferred;
    if (!event) return false;
    await event.prompt();
    const { outcome } = await event.userChoice;
    this.deferred = null;
    this.canInstall.set(false);
    return outcome === 'accepted';
  }
}
