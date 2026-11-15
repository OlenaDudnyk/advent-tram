export type Location = 'in' | 'out';
export type AgeGroup = 'kids_3_6' | 'kids_7_12' | 'adults' | 'family';
export type Duration = 5 | 15 | 30 | 60;

export interface Task {
  id: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  location: Location;
  duration: Duration;
  ageGroups: AgeGroup[];
  illustration: string;
}

export interface TaskState {
  rejected: Set<string>;
  saved: Set<string>;
  postponed: Set<string>;
  completed: Set<string>;
}
