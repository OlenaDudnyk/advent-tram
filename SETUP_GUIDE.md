# Advent Tram - Foundation Setup Guide

## ✅ What Has Been Created

A complete **foundational architecture** for the Advent Tram PWA, including:

### 1. **Folder Structure** ✓
```
src/app/
├── core/
│   ├── models/          (Task, Feed, Settings interfaces)
│   └── services/        (Storage, Tasks business logic)
└── pages/               (Placeholder dirs for 4 main pages)
```

### 2. **Core Models** ✓
- **task.model.ts** - Task interface with strict types (Location, AgeGroup, Duration)
- **feed.model.ts** - FeedEntry for memory cards (Strava-style)
- **settings.model.ts** - AppSettings with defaults
- **index.ts** - Barrel exports

### 3. **Core Services** ✓
- **storage.service.ts** - localStorage + IndexedDB (localForage) wrapper
  - App settings management
  - Task state tracking (rejected, saved, postponed, completed)
  - Feed entry persistence with photos
  
- **tasks.service.ts** - Task business logic with Angular Signals
  - Load tasks from JSON
  - Filter by age, location, duration
  - Queue management (next task)
  - State queries and updates

### 4. **Mock Data** ✓
- **tasks.json** - 8 realistic advent tasks with full metadata

---

## 🔧 Next Steps to Get Running

### Step 1: Verify Dependencies
Ensure `localforage` is installed:

```bash
npm list localforage
```

If missing, install it:
```bash
npm install localforage --save
npm install --save-dev @types/localforage
```

### Step 2: Update `app.config.ts` (or `main.ts`)
Ensure HTTP client is provided for TasksService to load JSON:

```typescript
import { HttpClientModule } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    HttpClientModule,  // ← Required for TasksService
    // ... other providers
  ],
};
```

Or in module-based setup:
```typescript
@NgModule({
  imports: [HttpClientModule, ...],
})
```

### Step 3: Initialize Services in App Component or Bootstrap
Add initialization logic to `app.component.ts`:

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { TasksService, StorageService } from './core/services';

@Component({
  selector: 'app-root',
  template: `<!-- routes outlet -->`,
})
export class AppComponent implements OnInit {
  private tasksService = inject(TasksService);
  private storageService = inject(StorageService);

  async ngOnInit() {
    try {
      // Load tasks from assets/data/tasks.json
      await this.tasksService.loadTasks();
      
      // Load user settings
      const settings = await this.storageService.loadSettings();
      
      // Load task state
      await this.storageService.loadTaskState();
      
      console.log('App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  }
}
```

### Step 4: Create First Page - Onboarding
Example structure for `src/app/pages/onboarding/onboarding.component.ts`:

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonToggle } from '@ionic/angular/standalone';
import { StorageService } from '../../core/services';
import { AppSettings, DEFAULT_SETTINGS } from '../../core/models';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [IonContent, IonButton, IonToggle],
  template: `
    <ion-content>
      <h1>Welcome to Advent Tram</h1>
      <!-- Language selection -->
      <!-- Age group selection -->
      <ion-button (click)="onContinue()">Begin</ion-button>
    </ion-content>
  `,
})
export class OnboardingComponent implements OnInit {
  private storageService = inject(StorageService);
  private router = inject(Router);
  
  settings: AppSettings = { ...DEFAULT_SETTINGS };

  async ngOnInit() {
    this.settings = await this.storageService.loadSettings();
  }

  async onContinue() {
    await this.storageService.saveSettings(this.settings);
    this.router.navigate(['/home']);
  }
}
```

### Step 5: Add Routes
Update `app.routes.ts`:

```typescript
import { Routes } from '@angular/router';
import { OnboardingComponent } from './pages/onboarding/onboarding.component';

export const routes: Routes = [
  { path: '', redirectTo: '/onboarding', pathMatch: 'full' },
  { path: 'onboarding', component: OnboardingComponent },
  { path: 'home', component: HomeComponent },
  { path: 'deck', component: SwipeDeckComponent },
  { path: 'complete/:taskId', component: CompleteTaskComponent },
];
```

---

## 📖 Service Usage Patterns

### Using TasksService
```typescript
export class SwipeDeckComponent {
  private tasksService = inject(TasksService);

  task = signal<Task | undefined>(undefined);

  ngOnInit() {
    // Get next available task
    this.task.set(this.tasksService.getNextTask());
  }

  onSave() {
    this.tasksService.saveTask(this.task()!.id);
  }

  onReject() {
    this.tasksService.rejectTask(this.task()!.id);
    this.task.set(this.tasksService.getNextTask());
  }

  onPostpone() {
    this.tasksService.postponeTask(this.task()!.id);
    this.task.set(this.tasksService.getNextTask());
  }
}
```

### Using StorageService
```typescript
export class CompleteTaskComponent {
  private storageService = inject(StorageService);

  async onSaveMemory(taskId: string, photo: string, note: string) {
    const entry: FeedEntry = {
      id: crypto.randomUUID(),
      taskId,
      title: 'Task Title',
      completedAt: new Date().toISOString(),
      photo,
      note,
    };
    
    await this.storageService.saveFeedEntry(entry);
  }

  async getFeed() {
    const entries = await this.storageService.getFeedEntries();
    return entries; // Already sorted by date (newest first)
  }
}
```

### Using Settings
```typescript
async changeLanguage(lang: 'ua' | 'en') {
  const settings = await this.storageService.loadSettings();
  settings.language = lang;
  await this.storageService.saveSettings(settings);
}
```

---

## 🧪 Testing the Setup

### Quick Validation
```typescript
// In browser console or a test component:
const tasksService = inject(TasksService);
const storageService = inject(StorageService);

// Load tasks
await tasksService.loadTasks();

// Check available tasks
console.log(tasksService.getAvailableTasks()); // Should show 8 tasks

// Filter by age group
console.log(tasksService.filterTasks({ ageGroups: ['family'] }));

// Test storage
await storageService.saveSettings({ language: 'ua', ageGroups: ['kids_7_12'] });
const settings = await storageService.loadSettings();
console.log(settings); // Should have your changes
```

---

## 📋 Project Features Ready to Use

✅ **Models:**
- Full TypeScript interfaces
- Strict type safety
- Age group and location filtering

✅ **Storage:**
- localStorage for settings/state (fast, efficient)
- IndexedDB for photos (large data)
- Clear separation of concerns

✅ **Tasks:**
- Load from JSON (cacheable)
- Filter by multiple criteria
- Queue management
- State tracking (reject/save/postpone/complete)

✅ **Mock Data:**
- 8 diverse advent tasks
- Real descriptions and durations
- Mix of indoor/outdoor and age groups

---

## 🚀 Ready to Build Components

You can now focus on implementing:
1. **Onboarding Screen** - Use StorageService to save preferences
2. **Home/Feed Screen** - Use StorageService.getFeedEntries()
3. **Swipe Deck Screen** - Use TasksService.getNextTask() & action methods
4. **Complete Task Screen** - Use StorageService.saveFeedEntry()

All data layers are production-ready!

---

## 📚 File Reference

| File | Purpose |
|------|---------|
| `src/app/core/models/task.model.ts` | Task & TaskState interfaces |
| `src/app/core/models/feed.model.ts` | FeedEntry interface |
| `src/app/core/models/settings.model.ts` | AppSettings & defaults |
| `src/app/core/services/storage.service.ts` | Data persistence layer |
| `src/app/core/services/tasks.service.ts` | Task business logic |
| `src/assets/data/tasks.json` | Mock advent tasks |
| `ARCHITECTURE.md` | Detailed architecture docs |

---

**Setup complete! Ready for component development.**
