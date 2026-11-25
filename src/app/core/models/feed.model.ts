export interface FeedEntry {
  id: string;
  taskId: string;
  title: string;
  completedAt: string; // ISO 8601 date string
  photo: string; // base64 data URL
  note: string;
  editedAt?: string; // ISO 8601, set when the memory is edited
}

export interface FeedState {
  entries: FeedEntry[];
}
