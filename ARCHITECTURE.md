# Advent Tram - Project Architecture

## 📁 Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── models/
│   │   │   ├── task.model.ts          # Task interface & types
│   │   │   ├── feed.model.ts          # Feed entry interface
│   │   │   ├── settings.model.ts      # App settings interface
│   │   │   └── index.ts               # Barrel export
│   │   └── services/
│   │       ├── storage.service.ts     # localStorage & IndexedDB wrapper
│   │       ├── tasks.service.ts       # Task business logic & filtering
│   │       └── index.ts               # Barrel export
│   └── pages/
│       ├── onboarding/                # Language & age selection
│       ├── home/                      # Main feed & navigation hub
│       ├── swipe-deck/                # Card swipe interaction
│       └── complete-task/             # Photo & memory capture
└── assets/
    └── data/
        └── tasks.json                 # Mock advent tasks
```

---

## 📦 Core Models

### `task.model.ts`
Defines the task structure and related types:

```typescript
export type Location = 'in' | 'out';          // Indoor or outdoor
export type AgeGroup = 'kids_3_6' | 'kids_7_12' | 'adults' | 'family';
export type Duration = 5 | 15 | 30 | 60;       // Minutes

export interface Task {
  id: string;                   // Unique task identifier
  title: string;                // Short title
  shortDesc: string;            // One-liner for cards
  fullDesc: string;             // Full description for detail view
  location: Location;           // Where the activity happens
  duration: Duration;           // Time commitment in minutes
  ageGroups: AgeGroup[];        // Applicable age groups
  illustration: string;         // Asset key/filename
}

export interface TaskState {
  rejected: Set<string>;        // Tasks user said "Never"
  saved: Set<string>;           // Bookmarked tasks
  postponed: Set<string>;       // "Later" actions
  completed: Set<string>;       // Finished tasks (with memory entry)
}
```

### `feed.model.ts`
Defines the memory feed structure (Strava-style feed):

```typescript
export interface FeedEntry {
  id: string;                   // Unique entry ID
  taskId: string;               // Reference to completed task
  title: string;                // Task title for display
  completedAt: string;          // ISO 8601 timestamp
  photo: string;                // Base64 data URL
  note: string;                 // User's memory note
}
```

### `settings.model.ts`
App preferences and defaults:

```typescript
export interface AppSettings {
  language: 'ua' | 'en';        // Ukrainian or English
  ageGroups: AgeGroup[];        // Selected age groups for filtering
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  ageGroups: ['family'],
};
```

---

## 🔧 Core Services

### `StorageService`
Wrapper around `localStorage` and `localForage` for data persistence:

**localStorage Usage:**
- App settings (language, age preferences)
- Task state tracking (rejected, saved, postponed, completed)
- Efficient for small, frequently-accessed data

**IndexedDB via localForage:**
- Feed entries with photos (base64 data)
- Scalable for large binary data
- Better performance for large datasets

**Key Methods:**
```typescript
// Settings
loadSettings(): Promise<AppSettings>
saveSettings(settings: AppSettings): Promise<void>

// Task State
loadTaskState(): Promise<TaskState>
rejectTask(taskId: string): void
saveTask(taskId: string): void
postponeTask(taskId: string): void
completeTask(taskId: string): void
isTaskRejected/Saved/Postponed/Completed(taskId: string): boolean

// Feed
saveFeedEntry(entry: FeedEntry): Promise<void>
getFeedEntries(): Promise<FeedEntry[]>
deleteFeedEntry(entryId: string): Promise<void>

// Cleanup
clearAllData(): Promise<void>
```

---

### `TasksService`
Business logic for task management and filtering using Angular Signals:

**Data Loading:**
- Loads `tasks.json` on app initialization
- Caches in memory with Angular Signal (`allTasks`)
- Tracks load state to prevent duplicate loads

**Filtering & Query Methods:**
```typescript
loadTasks(): Promise<void>                    // Load from assets
getAvailableTasks(): Task[]                   // Not rejected/completed
getSavedTasks(): Task[]                       // Bookmarked
getPostponedTasks(): Task[]                   // "Later" actions
getNextTask(options?): Task | undefined       // Next in queue

filterTasks(options: {
  ageGroups?: AgeGroup[];
  location?: Location;
  duration?: Duration;
}): Task[]                                     // Complex filtering

getTaskById(taskId: string): Task | undefined
getTaskState(taskId: string): TaskStateInfo
```

**State Management:**
```typescript
rejectTask(taskId: string): void
saveTask(taskId: string): void
postponeTask(taskId: string): void
completeTask(taskId: string): void
```

**Counters:**
```typescript
getAvailableTaskCount(): number
getSavedTaskCount(): number
```

---

## 📋 Mock Data (`tasks.json`)

Includes 8 diverse advent tasks with:
- Mix of indoor ('in') and outdoor ('out') activities
- Durations: 5, 15, 30, 60 minutes
- Age groups: kids_3_6, kids_7_12, adults, family
- Real-world descriptions and illustrations

**Example tasks:**
- "Bring the forest home" (15 min, family, indoor)
- "A little mess, a lot of joy" (30 min, family, gingerbread baking)
- "Winter walk adventure" (30 min, outdoor, nature collection)
- "Hot cocoa gathering" (5 min, family, cozy moment)
- "Outdoor scavenger hunt" (60 min, outdoor, search game)

---

## 🔌 Service Integration

### Dependency Injection
All services use Angular's `providedIn: 'root'` pattern for lazy loading:

```typescript
@Injectable({ providedIn: 'root' })
export class TasksService { ... }
```

### Typical Usage in Components
```typescript
export class SwipeDeckComponent {
  private tasksService = inject(TasksService);
  private storageService = inject(StorageService);

  async ngOnInit() {
    await this.tasksService.loadTasks();
    const nextTask = this.tasksService.getNextTask();
  }

  onSaveTask(taskId: string) {
    this.tasksService.saveTask(taskId);
  }

  async onCompleteTask(taskId: string, note: string, photo: string) {
    const feedEntry: FeedEntry = {
      id: crypto.randomUUID(),
      taskId,
      title: task.title,
      completedAt: new Date().toISOString(),
      photo,
      note,
    };
    await this.storageService.saveFeedEntry(feedEntry);
  }
}
```

---

## 🎯 Key Design Decisions

### 1. **Two-Tier Storage Strategy**
- **localStorage:** Settings & task state (small, text-based)
- **IndexedDB:** Feed entries (large binary photos)

### 2. **Angular Signals for State**
- Used in `TasksService` for reactive data management
- Replaces RxJS observables where simpler state is sufficient
- Performant for synchronous queries

### 3. **Strict TypeScript**
- All types defined explicitly
- No `any` types
- Discriminated unions for clear state management

### 4. **Separation of Concerns**
- **StorageService:** Data persistence layer
- **TasksService:** Business logic & filtering
- **Models:** Pure interfaces (no logic)

### 5. **Barrel Exports**
- `src/app/core/models/index.ts`
- `src/app/core/services/index.ts`
- Simplifies imports: `import { Task, StorageService } from '@/core'`

---

## 🚀 Next Steps

### Page Implementation Order:
1. **Onboarding** - Language & age group selection
2. **Home (Feed)** - Display completed tasks from feed
3. **Swipe Deck** - Core interaction (Never/Save/Later)
4. **Complete Task** - Photo upload & memory capture

### Additional Services to Add:
- **LocationService** - Geolocation for outdoor tasks
- **NotificationService** - Daily reminders
- **SyncService** - Cloud backup (optional)

### Component Patterns:
- Use standalone components (Angular 16+)
- Inject services with `inject()`
- Use signals for component state
- Leverage Ionic components for mobile-first UI

---

## 📱 Dependencies

Ensure these are in `package.json`:
```json
{
  "@angular/core": "^18.0.0",
  "@angular/common": "^18.0.0",
  "@ionic/angular": "^8.0.0",
  "localforage": "^1.10.0",
  "typescript": "^5.0.0"
}
```

---

## 🔄 Data Flow Example

```
User Opens App
    ↓
[App Init] → TasksService.loadTasks() → Load tasks.json
    ↓
[Onboarding] → StorageService.loadSettings() → Set language & age
    ↓
[Home] → TasksService.getAvailableTasks() → Filter by prefs
    ↓
[Swipe Deck] → TasksService.getNextTask() → Show current card
    ↓
[User Action] → TasksService.saveTask/rejectTask() → Update state
    ↓
[Complete Task] → StorageService.saveFeedEntry() → Save memory
    ↓
[Feed] → StorageService.getFeedEntries() → Display memories (sorted by date)
```

---

**Architecture created by Copilot Ionic & Angular Architect**
**Last updated: 2026-11-15**
