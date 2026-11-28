export enum Language {
  English = 'en',
  Ukrainian = 'ua',
  Polish = 'pl',
  Spanish = 'es',
  German = 'de',
  French = 'fr',
}

/** Languages in the order they appear in the switcher, with their short labels. */
export const LANGUAGE_OPTIONS: readonly { value: Language; label: string }[] = [
  { value: Language.English, label: 'EN' },
  { value: Language.Ukrainian, label: 'УК' },
  // { value: Language.Polish, label: 'PL' },
  // { value: Language.Spanish, label: 'ES' },
  // { value: Language.German, label: 'DE' },
  // { value: Language.French, label: 'FR' },
];

/** BCP 47 locale per app language, for Intl date formatting. */
export const LOCALES: Record<Language, string> = {
  [Language.English]: 'en-GB',
  [Language.Ukrainian]: 'uk-UA',
  [Language.Polish]: 'pl-PL',
  [Language.Spanish]: 'es-ES',
  [Language.German]: 'de-DE',
  [Language.French]: 'fr-FR',
};

/** Valid BCP 47 tag per app language (the stored code `ua` is `uk` for browsers and search engines). */
export const LANGUAGE_TAGS: Record<Language, string> = {
  [Language.English]: 'en',
  [Language.Ukrainian]: 'uk',
  [Language.Polish]: 'pl',
  [Language.Spanish]: 'es',
  [Language.German]: 'de',
  [Language.French]: 'fr',
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (Object.values(Language) as string[]).includes(value);
}

/** Language names in their own language. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  [Language.English]: 'English',
  [Language.Ukrainian]: 'Українська',
  [Language.Polish]: 'Polski',
  [Language.Spanish]: 'Español',
  [Language.German]: 'Deutsch',
  [Language.French]: 'Français',
};
