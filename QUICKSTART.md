# 🎄 Advent Tram - Quick Start Guide

## What You Have
A complete **foundation architecture** for your Advent Tram PWA with:
- ✅ Core TypeScript models & interfaces
- ✅ Production-ready services
- ✅ Mock data with 8 advent tasks
- ✅ Page structure ready for implementation
- ✅ Comprehensive documentation

## Installation (2 minutes)

```bash
# Install localforage for IndexedDB storage
npm install localforage --save
npm install --save-dev @types/localforage

# Verify build passes
npm run build
```

## Integration (5 minutes)

**In your `app.config.ts` or module:**

```typescript
import { HttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    HttpClient, // Required for TasksService
  ],
};
```

**In your `app.component.ts`:**

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { TasksService, StorageService } from './core/services';

@Component({
  selector: 'app-root',
  // ... template
})
export class AppComponent implements OnInit {
  private tasksService = inject(TasksService);
  private storageService = inject(StorageService);

  async ngOnInit() {
    await this.tasksService.loadTasks();
    await this.storageService.loadTaskState();
  }
}
```

## Using Services

### Load & Get Tasks

```typescript
// Get next task (filtered by user preferences)
const task = this.tasksService.getNextTask({
  ageGroups: ['family'],
  location: 'in',
  duration: 30
});

// Get all available tasks
const allTasks = this.tasksService.getAvailableTasks();

// Get saved/bookmarked tasks
const saved = this.tasksService.getSavedTasks();
```

### Handle User Actions

```typescript
// User says "Never"
this.tasksService.rejectTask(taskId);

// User says "Save"
this.tasksService.saveTask(taskId);

// User says "Later"
this.tasksService.postponeTask(taskId);

// User completes task
this.tasksService.completeTask(taskId);
```

### Save Memory (Photo + Note)

```typescript
import { FeedEntry } from '@/core/models';

async saveMemory(taskId: string, photo: string, note: string) {
  const entry: FeedEntry = {
    id: crypto.randomUUID(),
    taskId,
    title: 'Task Title',
    completedAt: new Date().toISOString(),
    photo, // base64 data URL from camera
    note,
  };
  
  await this.storageService.saveFeedEntry(entry);
  this.tasksService.completeTask(taskId);
}
```

### Display Feed

```typescript
// Get all completed tasks with photos (newest first)
const memories = await this.storageService.getFeedEntries();

// Memories are automatically sorted by date
memories.forEach(entry => {
  console.log(entry.title, entry.completedAt, entry.photo);
});
```

### Save Settings

```typescript
import { AppSettings } from '@/core/models';

async updatePreferences(language: 'ua' | 'en', ageGroups: string[]) {
  const settings: AppSettings = { language, ageGroups };
  await this.storageService.saveSettings(settings);
}
```

## File Reference

| File | Purpose |
|------|---------|
| `src/app/core/models/task.model.ts` | Task types & interfaces |
| `src/app/core/models/feed.model.ts` | Memory card interface |
| `src/app/core/models/settings.model.ts` | App settings interface |
| `src/app/core/services/storage.service.ts` | Data persistence |
| `src/app/core/services/tasks.service.ts` | Task business logic |
| `src/assets/data/tasks.json` | Mock advent tasks |

## Documentation

- **ARCHITECTURE.md** (8.8 KB)
  - Complete design & patterns
  - Service API reference
  - Data flow diagrams

- **SETUP_GUIDE.md** (7.9 KB)
  - Detailed integration steps
  - Code patterns & examples
  - Component usage guide

- **IMPLEMENTATION_CHECKLIST.md** (11 KB)
  - 8-phase development roadmap
  - Per-phase tasks & code
  - Testing checklist

- **PROJECT_FOUNDATION_SUMMARY.md** (6.4 KB)
  - Quick feature overview
  - Ready-to-use checklist

## Next: Build Your Pages

### Page 1: Onboarding
```typescript
// Select language & age groups, save to StorageService
```

### Page 2: Home/Feed
```typescript
// Display memories from StorageService.getFeedEntries()
```

### Page 3: Swipe Deck
```typescript
// Show TasksService.getNextTask()
// Handle Never/Save/Later buttons
```

### Page 4: Complete Task
```typescript
// Photo upload + memory note
// Save via StorageService.saveFeedEntry()
```

Follow **IMPLEMENTATION_CHECKLIST.md** for detailed phase-by-phase guide!

## Common Patterns

### Inject Services
```typescript
private taskService = inject(TasksService);
private storageService = inject(StorageService);
```

### Use Signals for State
```typescript
task = signal<Task | undefined>(undefined);

ngOnInit() {
  this.task.set(this.tasksService.getNextTask());
}
```

### Handle Async
```typescript
async onInit() {
  await this.tasksService.loadTasks();
  const memories = await this.storageService.getFeedEntries();
}
```

## TypeScript Types

All imports from `@/core/models`:

```typescript
import {
  Task,
  FeedEntry,
  AppSettings,
  Location,
  AgeGroup,
  Duration,
} from '@/core/models';
```

## That's It! 🎉

All backend logic is ready. Focus on UI/UX using Ionic components!

---

**Questions?** Check the full documentation files for detailed examples and patterns.

**Ready to code?** Start with the Onboarding page following IMPLEMENTATION_CHECKLIST.md Phase 3.1
