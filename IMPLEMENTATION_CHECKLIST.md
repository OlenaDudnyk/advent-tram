# ✅ Advent Tram Implementation Checklist

## Phase 1: Foundation Setup (Completed ✓)
- [x] Create folder structure (core/models, core/services, pages)
- [x] Define TypeScript models (Task, FeedEntry, AppSettings)
- [x] Implement StorageService (localStorage + IndexedDB)
- [x] Implement TasksService (filtering, queue management)
- [x] Create mock data (8 advent tasks)
- [x] Write documentation (ARCHITECTURE, SETUP, SUMMARY)

---

## Phase 2: Dependencies & Configuration (Next)
- [ ] Install localforage
  ```bash
  npm install localforage --save
  npm install --save-dev @types/localforage
  ```

- [ ] Verify HttpClientModule is provided in app config
  
- [ ] Add service initialization to AppComponent
  ```typescript
  async ngOnInit() {
    await this.tasksService.loadTasks();
    await this.storageService.loadTaskState();
  }
  ```

- [ ] Verify TypeScript compilation passes
  ```bash
  npm run build
  ```

---

## Phase 3: Core Pages Implementation

### 3.1 Onboarding Page
- [ ] Create `onboarding.component.ts` (standalone)
- [ ] Design language selection (UA / EN)
- [ ] Design age group selection (checkboxes: kids_3_6, kids_7_12, adults, family)
- [ ] Save preferences using StorageService
- [ ] Route to Home on completion

**File**: `src/app/pages/onboarding/onboarding.component.ts`

### 3.2 Home/Feed Page
- [ ] Create `home.component.ts` (standalone)
- [ ] Display "December memories" feed from StorageService.getFeedEntries()
- [ ] Show feed entries sorted by completedAt (newest first)
- [ ] Display task count (available/saved)
- [ ] Add navigation to Swipe Deck & Saved Tasks
- [ ] Add settings icon/menu

**File**: `src/app/pages/home/home.component.ts`

### 3.3 Swipe Deck Page
- [ ] Create `swipe-deck.component.ts` (standalone)
- [ ] Load next task with TasksService.getNextTask()
- [ ] Display task card with:
  - Title, shortDesc, illustration, duration, age groups
  - Back arrow
- [ ] Implement 3 action buttons:
  - "Never" → TasksService.rejectTask() → get next
  - "Save" → TasksService.saveTask() → get next
  - "Later" → TasksService.postponeTask() → get next
- [ ] Show card counter (e.g., "6 / 24")
- [ ] Handle "no more tasks" state

**File**: `src/app/pages/swipe-deck/swipe-deck.component.ts`

### 3.4 Complete Task Page (Memory Capture)
- [ ] Create `complete-task.component.ts` (standalone)
- [ ] Route param: taskId
- [ ] Section 1: "One for the memory box"
  - Load task details
  - Photo upload area (camera/gallery)
  - Optional: preview uploaded photo
- [ ] Section 2: "A little note to remember"
  - Textarea for memory note (max 140 chars)
  - Char counter
- [ ] "Complete & Share Postcard" button
  - Create FeedEntry with:
    - id: crypto.randomUUID()
    - taskId
    - title: from task
    - completedAt: new Date().toISOString()
    - photo: base64 from upload
    - note: user input
  - Save via StorageService.saveFeedEntry()
  - Mark as completed: TasksService.completeTask()
  - Show success & route to Home

**File**: `src/app/pages/complete-task/complete-task.component.ts`

---

## Phase 4: Navigation & Routing

- [ ] Create routes
  ```typescript
  export const routes: Routes = [
    { path: '', redirectTo: '/onboarding', pathMatch: 'full' },
    { path: 'onboarding', component: OnboardingComponent },
    { path: 'home', component: HomeComponent },
    { path: 'deck', component: SwipeDeckComponent },
    { path: 'complete/:taskId', component: CompleteTaskComponent },
  ];
  ```

- [ ] Add navigation between pages
- [ ] Handle app first-load (redirect to onboarding or home based on settings)
- [ ] Add back navigation where needed

---

## Phase 5: Features to Implement

### 5.1 Filtering on Swipe Deck
- [ ] Apply selected age groups & location preferences
- [ ] Use TasksService.filterTasks(options)
- [ ] Update getNextTask() to respect filters

### 5.2 Saved Tasks View
- [ ] Create or extend Home page
- [ ] Display TasksService.getSavedTasks()
- [ ] Allow un-save action
- [ ] Link to complete task

### 5.3 Settings Page (Optional)
- [ ] Allow changing language after onboarding
- [ ] Allow re-selecting age groups
- [ ] Clear all data option (StorageService.clearAllData())

### 5.4 Photo Capture
- [ ] Use Camera/Gallery plugins (capacitor)
- [ ] Convert to base64 for storage
- [ ] Show preview before saving

### 5.5 Responsive Design
- [ ] Ensure mobile-first layout
- [ ] Use Ionic components (IonContent, IonButton, IonCard, etc.)
- [ ] Test on multiple screen sizes

---

## Phase 6: Testing & Validation

### Unit Tests
- [ ] StorageService methods
- [ ] TasksService filtering logic
- [ ] Task state mutations

### Integration Tests
- [ ] Load tasks → apply filters → get next
- [ ] Save task → verify state → fetch saved
- [ ] Complete task → create feed entry → query feed

### Manual Testing
- [ ] Onboarding flow
- [ ] Swipe through all tasks
- [ ] Save/reject/postpone cards
- [ ] Complete a task with photo & note
- [ ] View feed with completed tasks
- [ ] Verify data persists after reload

---

## Phase 7: Styling & Polish

- [ ] Apply color variables from `src/theme/variables.scss`
  - Primary: forest green (#2D5D4F)
  - Secondary: wine red (#8B3E52)
  - Background: cream (#F5F1ED)
  - Accent: light beige (#E8E3DE)

- [ ] Refine card animations
- [ ] Add micro-interactions
- [ ] Polish button states
- [ ] Improve error messages

---

## Phase 8: Optional Enhancements

- [ ] Notifications (daily reminder to complete a task)
- [ ] Share feed entries (postcard generation)
- [ ] Undo task action (stack-based)
- [ ] Task search/filter on home
- [ ] Statistics (tasks completed, total time, etc.)
- [ ] Cloud sync (backend integration)

---

## Code Quality Checklist

- [ ] All files use strict TypeScript (no `any`)
- [ ] Services are properly injected with `inject()`
- [ ] Components are standalone
- [ ] Signals used for reactive state
- [ ] No console.log in production code
- [ ] Error handling in all async operations
- [ ] Services properly typed
- [ ] Barrel exports working
- [ ] No circular dependencies

---

## Performance Checklist

- [ ] Tasks loaded once and cached
- [ ] IndexedDB used for large data (photos)
- [ ] Feed entries sorted efficiently
- [ ] No unnecessary re-renders
- [ ] Lazy load pages where possible
- [ ] Images optimized for mobile

---

## Accessibility Checklist

- [ ] Proper ARIA labels on buttons
- [ ] Keyboard navigation support
- [ ] Color contrast meets WCAG standards
- [ ] Touch targets ≥ 44px
- [ ] Semantic HTML structure
- [ ] Form labels properly associated

---

## Deployment Checklist

- [ ] Build passes without warnings
- [ ] All environment configs set
- [ ] Service workers configured (PWA)
- [ ] Icons & splash screens added
- [ ] App name & version updated
- [ ] Privacy policy & terms included
- [ ] Testing on real device

---

## Progress Tracking

| Phase | Task | Status | Date |
|-------|------|--------|------|
| 1 | Foundation setup | ✅ Complete | Nov 15, 2026 |
| 2 | Dependencies | ⏳ Ready | - |
| 3 | Core pages | ⏳ Ready | - |
| 4 | Routing | ⏳ Ready | - |
| 5 | Features | ⏳ Ready | - |
| 6 | Testing | ⏳ Ready | - |
| 7 | Styling | ⏳ Ready | - |
| 8 | Enhancements | ⏳ Optional | - |

---

**Last Updated**: Nov 15, 2026
**Status**: Foundation Complete - Ready for Phase 2
