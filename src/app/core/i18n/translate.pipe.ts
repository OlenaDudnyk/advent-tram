import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';

import { Language } from '../models/language.model';

import { de } from './de';
import type { TranslationKey } from './en';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { pl } from './pl';
import { ua } from './ua';

const translations: Record<Language, Record<TranslationKey, string>> = {
  [Language.English]: en,
  [Language.Ukrainian]: ua,
  [Language.Polish]: pl,
  [Language.Spanish]: es,
  [Language.German]: de,
  [Language.French]: fr,
};

@Pipe({ name: 'translate', standalone: true })
export class TranslatePipe implements PipeTransform {
  transform(key: TranslationKey, language: Language): string {
    return translations[language][key];
  }
}
