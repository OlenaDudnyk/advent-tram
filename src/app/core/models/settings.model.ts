import { Language, isLanguage } from './language.model';
import type { AgeGroup } from './task.model';

/** church: starts on the first Advent Sunday, a candle day every seven days. classic: Dec 1-25, no candles. */
export type AdventStyle = 'church' | 'classic';

export interface AppSettings {
  language: Language;
  ageGroups: AgeGroup[];
  adventStyle?: AdventStyle;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: Language.English,
  ageGroups: ['family'],
  adventStyle: 'church',
};

const AGE_GROUPS: readonly AgeGroup[] = ['kids_3_6', 'kids_7_12', 'adults', 'family'];

/**
 * Turns whatever was found in storage into valid settings: unknown language falls back to English,
 * invalid / empty age groups to the default, an unknown advent style to church.
 */
export function sanitizeSettings(raw: unknown): AppSettings {
  const value = (raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const groups = Array.isArray(value['ageGroups'])
    ? [...new Set(value['ageGroups'].filter((g): g is AgeGroup => AGE_GROUPS.includes(g as AgeGroup)))]
    : [];
  return {
    language: isLanguage(value['language']) ? value['language'] : DEFAULT_SETTINGS.language,
    ageGroups: groups.length ? groups : [...DEFAULT_SETTINGS.ageGroups],
    adventStyle: value['adventStyle'] === 'classic' ? 'classic' : 'church',
  };
}
