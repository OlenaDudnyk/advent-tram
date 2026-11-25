import { Language } from './language.model';
import { DEFAULT_SETTINGS, sanitizeSettings } from './settings.model';

describe('sanitizeSettings', () => {
  it('keeps valid values', () => {
    expect(sanitizeSettings({ language: 'pl', ageGroups: ['adults', 'kids_3_6'], adventStyle: 'classic' }))
      .toEqual({ language: Language.Polish, ageGroups: ['adults', 'kids_3_6'], adventStyle: 'classic' });
  });

  it('falls back to defaults for unknown or malformed data', () => {
    for (const raw of [null, undefined, 42, 'x', [], {}, { language: 'xx', ageGroups: 'family', adventStyle: 7 }]) {
      const settings = sanitizeSettings(raw);
      expect(settings.language).toBe(DEFAULT_SETTINGS.language);
      expect(settings.ageGroups).toEqual(DEFAULT_SETTINGS.ageGroups);
      expect(settings.adventStyle).toBe('church');
    }
  });

  it('drops unknown age groups and duplicates, and never returns an empty list', () => {
    expect(sanitizeSettings({ ageGroups: ['adults', 'adults', 'toddlers'] }).ageGroups).toEqual(['adults']);
    expect(sanitizeSettings({ ageGroups: ['toddlers'] }).ageGroups).toEqual(DEFAULT_SETTINGS.ageGroups);
  });
});
