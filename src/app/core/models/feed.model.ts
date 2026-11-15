export interface FeedEntry {
  id: string;
  taskId: string;
  title: string;
  completedAt: string; // ISO 8601 date string
  photo: string; // base64 data URL
  note: string;
}

export interface FeedState {
  entries: FeedEntry[];
}
