import type { Language } from './language.model';


export type Location = 'in' | 'out';
export type AgeGroup = 'kids_3_6' | 'kids_7_12' | 'adults' | 'family';
export type InspirationType = 'pinterest' | 'youtube' | 'link';
export type Duration = 5 | 15 | 30 | 60;

export interface TaskText {
  title: string;
  shortDesc: string;
  fullDesc: string;
}

export interface Task {
  id: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  location: Location;
  duration: Duration;
  ageGroups: AgeGroup[];
  /** Picture file in `assets/` (see content/ideas); a default is used when omitted. */
  image?: string;
  tags?: string[];
  category?: 'activity' | 'sunday_silence' | 'heart_deed';
  /** Optional link to ideas / a tutorial / a recipe. */
  inspirationUrl?: string;
  /** Platform badge; detected from the URL when omitted. */
  inspirationType?: InspirationType;
  reflection?: Partial<Record<Language, string>> | string;
}

export interface TaskState {
  rejected: Set<string>;
  saved: Set<string>;
  postponed: Set<string>;
  completed: Set<string>;
}
