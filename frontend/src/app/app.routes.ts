import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then(m => m.Register),
    canActivate: [guestGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardPage),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile').then(m => m.ProfilePage),
    canActivate: [authGuard],
  },
  {
    path: 'library',
    loadComponent: () => import('./features/library/library').then(m => m.LibraryPage),
    canActivate: [authGuard],
  },
  {
    path: 'quiz-manager',
    loadChildren: () => import('./features/quiz-manager/quiz-manager.module').then(m => m.QuizManagerModule),
    canActivate: [authGuard],
  },
    {
      path: 'article-manager',
      loadChildren: () => import('./features/article-manager/article-manager.module').then(m => m.ArticleManagerModule),
      canActivate: [authGuard],
    },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];