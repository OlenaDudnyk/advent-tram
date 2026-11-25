import { Injectable, effect, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { TranslatePipe } from '../i18n/translate.pipe';
import { Language } from '../models';

import { StorageService } from './storage.service';

const OG_LOCALES: Record<Language, string> = {
  [Language.English]: 'en_GB',
  [Language.Ukrainian]: 'uk_UA',
  [Language.Polish]: 'pl_PL',
  [Language.Spanish]: 'es_ES',
  [Language.German]: 'de_DE',
  [Language.French]: 'fr_FR',
};

/** Keeps the document title and the description / Open Graph tags in the app language. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly storage = inject(StorageService);

  constructor() {
    effect(() => {
      const language = this.storage.language();
      const pipe = new TranslatePipe();
      const title = pipe.transform('seo.title', language);
      const description = pipe.transform('seo.description', language);
      this.title.setTitle(title);
      this.meta.updateTag({ name: 'description', content: description });
      this.meta.updateTag({ property: 'og:title', content: title });
      this.meta.updateTag({ property: 'og:description', content: description });
      this.meta.updateTag({ property: 'og:locale', content: OG_LOCALES[language] });
      this.meta.updateTag({ name: 'twitter:title', content: title });
      this.meta.updateTag({ name: 'twitter:description', content: description });
    });
  }
}
