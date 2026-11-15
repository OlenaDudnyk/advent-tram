import { AgeGroup } from './task.model';

export interface AppSettings {
  language: 'ua' | 'en';
  ageGroups: AgeGroup[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  ageGroups: ['family'],
};
