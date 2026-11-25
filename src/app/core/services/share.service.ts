import { Injectable } from '@angular/core';

import { TranslatePipe } from '../i18n/translate.pipe';
import type { FeedEntry, Language } from '../models';

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

@Injectable({ providedIn: 'root' })
export class ShareService {
  /** Formats a memory as plain text for sharing or copying. */
  memoryText(entry: FeedEntry, language: Language): string {
    const header = new TranslatePipe().transform('memory.shareHeader', language);
    return [entry.title, entry.note, `— ${header}`].filter(Boolean).join('\n');
  }

  /** Shares via Web Share API (with photo when supported), falling back to the clipboard. */
  async shareMemory(entry: FeedEntry, language: Language): Promise<ShareResult> {
    const text = this.memoryText(entry, language);
    return this.share({ title: entry.title, text }, entry.photo);
  }

  async share(data: { title: string; text: string; url?: string }, photo = ''): Promise<ShareResult> {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const file = photo ? await this.photoFile(photo) : null;
        const withFile = file && navigator.canShare?.({ files: [file] }) ? { ...data, files: [file] } : data;
        await navigator.share(withFile);
        return 'shared';
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
        console.warn('Web Share failed, falling back to clipboard:', error);
      }
    }
    try {
      await navigator.clipboard.writeText([data.text, data.url].filter(Boolean).join('\n'));
      return 'copied';
    } catch (error) {
      console.error('Unable to copy to clipboard:', error);
      return 'failed';
    }
  }

  private async photoFile(dataUrl: string): Promise<File | null> {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      return new File([blob], 'advent-tram-memory.jpg', { type: blob.type || 'image/jpeg' });
    } catch {
      return null;
    }
  }
}
