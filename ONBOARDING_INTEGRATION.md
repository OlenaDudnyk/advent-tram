import { Routes } from '@angular/router';
import { OnboardingComponent } from './pages/onboarding/onboarding.component';

/**
 * Add these routes to your app.routes.ts file
 * 
 * Example:
 * ```
 * export const routes: Routes = [
 *   { path: '', redirectTo: '/onboarding', pathMatch: 'full' },
 *   { path: 'onboarding', component: OnboardingComponent },
 *   { path: 'home', component: HomeComponent },
 *   // ... other routes
 * ];
 * ```
 */

export const ONBOARDING_ROUTES: Routes = [
  {
    path: 'onboarding',
    component: OnboardingComponent,
    data: { title: 'Onboarding - Advent Tram' },
  },
];

/**
 * Example app.routes.ts:
 * 
 * ```typescript
 * import { Routes } from '@angular/router';
 * import { OnboardingComponent } from './pages/onboarding/onboarding.component';
 * import { HomeComponent } from './pages/home/home.component';
 * 
 * export const routes: Routes = [
 *   { path: '', redirectTo: '/onboarding', pathMatch: 'full' },
 *   { path: 'onboarding', component: OnboardingComponent },
 *   { path: 'home', component: HomeComponent },
 *   { path: 'deck', component: SwipeDeckComponent },
 *   { path: 'complete/:taskId', component: CompleteTaskComponent },
 * ];
 * ```
 */
