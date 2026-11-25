import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./pages/onboarding/onboarding.component').then(
        (m) => m.OnboardingComponent,
      ),
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'adventure',
    loadComponent: () => import('./pages/swipe-deck/swipe-deck.page').then((m) => m.SwipeDeckPage),
  },
  {
    path: 'saved',
    loadComponent: () => import('./pages/saved-ideas/saved-ideas.page').then((m) => m.SavedIdeasPage),
  },
  {
    path: 'tram-route',
    loadComponent: () => import('./pages/tram-route/tram-route.page').then((m) => m.TramRoutePage),
  },
  {
    path: 'coffee',
    loadComponent: () => import('./pages/coffee/coffee.page').then((m) => m.CoffeePage),
  },
  {
    path: 'privacy',
    loadComponent: () => import('./pages/privacy/privacy.page').then((m) => m.PrivacyPage),
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: '',
    // Returning users (settings already saved) land on Home; first-time visitors see onboarding.
    redirectTo: () => (typeof localStorage !== 'undefined' && localStorage.getItem('advent_tram_settings') ? 'home' : 'onboarding'),
    pathMatch: 'full',
  },
];
