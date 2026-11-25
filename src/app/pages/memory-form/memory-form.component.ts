import type { OnInit } from '@angular/core';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { IonModal } from '@ionic/angular';

import type { TranslationKey } from '../../core/i18n/en';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { FeedEntry, Language, Task } from '../../core/models';
import { LOCALES } from '../../core/models';
import { ImageService, StorageService } from '../../core/services';

/** Largest file we accept from the picker; it is downscaled before saving. */
const MAX_PICK_BYTES = 20 * 1024 * 1024;

@Component({
  selector: 'app-memory-form',
  imports: [IonModal, TranslatePipe],
  templateUrl: './memory-form.component.html',
  styleUrls: ['./memory-form.component.scss'],
})
export class MemoryFormComponent implements OnInit {
  private readonly storage = inject(StorageService);
  private readonly images = inject(ImageService);
  @Input({ required: true }) task!: Task;
  @Input({ required: true }) title!: string;
  @Input({ required: true }) language!: Language;
  /** When set, the form edits this saved memory instead of creating a new one. */
  @Input() entry: FeedEntry | null = null;
  @Output() readonly finished = new EventEmitter<void>();
  @Output() readonly deleted = new EventEmitter<void>();
  @Output() readonly cancelled = new EventEmitter<void>();
  @Output() readonly busyChange = new EventEmitter<boolean>();
  readonly maxNote = 140;
  readonly photo = signal('');
  readonly note = signal('');
  readonly error = signal<TranslationKey | null>(null);
  readonly saving = signal(false);
  readonly confirmingDelete = signal(false);

  ngOnInit(): void {
    if (this.entry) {
      this.photo.set(this.entry.photo);
      this.note.set(this.entry.note);
    }
  }

  dateLabel(): string {
    const date = this.entry ? new Date(this.entry.completedAt) : new Date();
    return new Intl.DateTimeFormat(LOCALES[this.language], { day: 'numeric', month: 'long' }).format(date);
  }

  async choosePhoto(event: Event): Promise<void> {
    if (!(event.target instanceof HTMLInputElement)) return;
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > MAX_PICK_BYTES) {
      this.error.set('route.photoError');
      return;
    }
    try {
      // Resize and strip metadata (EXIF location etc.) before the photo is ever stored or shared.
      this.photo.set(await this.images.prepareMemoryPhoto(file));
      this.error.set(null);
    } catch (error) {
      console.error('Unable to read photo:', error);
      this.error.set('route.photoError');
    }
  }

  updateNote(event: Event): void {
    if (event.target instanceof HTMLTextAreaElement) this.note.set(event.target.value);
  }

  async delete(): Promise<void> {
    if (!this.entry || this.saving()) return;
    this.saving.set(true);
    this.busyChange.emit(true);
    try {
      await this.storage.deleteFeedEntry(this.entry.id);
      this.confirmingDelete.set(false);
      this.deleted.emit();
    } catch (error) {
      console.error('Unable to delete memory:', error);
      this.error.set('route.saveError');
      this.confirmingDelete.set(false);
    } finally {
      this.saving.set(false);
      this.busyChange.emit(false);
    }
  }

  async save(): Promise<void> {
    if (!this.photo() || this.saving()) return;
    this.saving.set(true);
    this.busyChange.emit(true);
    try {
      if (this.entry) {
        await this.storage.updateFeedEntry(this.entry.id, { photo: this.photo(), note: this.note().trim() });
      } else {
        await this.storage.saveFeedEntry({
          id: crypto.randomUUID(), taskId: this.task.id, title: this.title,
          completedAt: new Date().toISOString(), photo: this.photo(), note: this.note().trim(),
        });
      }
      this.finished.emit();
    } catch (error) {
      console.error('Unable to save memory:', error);
      this.error.set('route.saveError');
    } finally {
      this.saving.set(false);
      this.busyChange.emit(false);
    }
  }
}
