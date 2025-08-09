import { Injectable, ErrorHandler } from '@angular/core';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    // Suppress NavigatorLockAcquireTimeoutError as it's a known Supabase issue
    if (error?.name === 'NavigatorLockAcquireTimeoutError' || 
        error?.message?.includes('NavigatorLockAcquireTimeoutError') ||
        error?.message?.includes('lock:sb-') ||
        error?.toString()?.includes('NavigatorLockAcquireTimeoutError') ||
        error?.toString()?.includes('overrideMethod @ hook.js')) {
      // Silently ignore these errors as they don't affect functionality
      return;
    }

    // Also check if the error stack contains the NavigatorLockAcquireTimeoutError
    if (error?.stack && error.stack.includes('NavigatorLockAcquireTimeoutError')) {
      return;
    }

    // Log other errors normally
    console.error('Global error caught:', error);
  }
}
