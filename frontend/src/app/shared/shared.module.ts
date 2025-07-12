/**
 * Shared Module - Reusable Components and Utilities
 * 
 * This module contains components, pipes, directives and utilities
 * that are used across multiple features.
 * 
 * Can be imported in any feature module.
 */

// Components
export * from './components/navbar/navbar';
export * from './components/toast-notification/toast-notification';

// Utils
export * from './utils/safe-access';

// Pipes (to be added)
// export * from './pipes/...';

// Directives (to be added)
// export * from './directives/...';

// Shared Interfaces
export interface NotificationConfig {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
  timestamp: Date;
}
