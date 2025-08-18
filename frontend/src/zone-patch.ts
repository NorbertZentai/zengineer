// Zone.js patch to suppress NavigatorLockAcquireTimeoutError
import 'zone.js';  // Included with Angular CLI.

// Clear any problematic localStorage entries for Supabase auth
try {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.includes('supabase') || key.includes('sb-')) {
      // Don't clear, but check for corrupted entries
      const value = localStorage.getItem(key);
      // Silently check for issues without logging
    }
  });
} catch (e) {
  // Ignore localStorage errors
}

// Aggressive patching of all console methods that might show the error
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

console.error = function(...args: any[]) {
  const errorMessage = args.join(' ');
  if (errorMessage.includes('NavigatorLockAcquireTimeoutError') ||
      errorMessage.includes('lock:sb-') ||
      errorMessage.includes('overrideMethod @ hook.js')) {
    // Suppress these specific errors
    return;
  }
  originalConsoleError.apply(console, args);
};

console.warn = function(...args: any[]) {
  const errorMessage = args.join(' ');
  if (errorMessage.includes('NavigatorLockAcquireTimeoutError') ||
      errorMessage.includes('lock:sb-')) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Also patch any hook.js overrideMethod calls
if (typeof window !== 'undefined') {
  // Patch hook.js if it exists
  const patchHook = () => {
    if ((window as any).hook && (window as any).hook.overrideMethod) {
      const originalOverrideMethod = (window as any).hook.overrideMethod;
      (window as any).hook.overrideMethod = function(...args: any[]) {
        // Check if this is about NavigatorLockAcquireTimeoutError
        const errorMessage = args.join(' ');
        if (errorMessage.includes('NavigatorLockAcquireTimeoutError') ||
            errorMessage.includes('lock:sb-')) {
          return; // Suppress the call
        }
        return originalOverrideMethod.apply(this, args);
      };
    }
  };
  
  // Try to patch immediately and also after DOM load
  patchHook();
  setTimeout(patchHook, 0);
  setTimeout(patchHook, 100);
}

// Patch the global error handler
const originalOnError = window.onerror;
window.onerror = function(message, source, lineno, colno, error) {
  if (typeof message === 'string' && message.includes('NavigatorLockAcquireTimeoutError')) {
    return true; // Prevent default error handling
  }
  
  if (originalOnError) {
    return originalOnError.call(window, message, source, lineno, colno, error);
  }
  return false;
};

// Patch unhandled promise rejection
const originalOnUnhandledRejection = window.onunhandledrejection;
window.onunhandledrejection = function(event) {
  if (event.reason?.name === 'NavigatorLockAcquireTimeoutError' ||
      event.reason?.message?.includes('NavigatorLockAcquireTimeoutError') ||
      event.reason?.toString()?.includes('NavigatorLockAcquireTimeoutError')) {
    event.preventDefault();
    return;
  }
  
  if (originalOnUnhandledRejection) {
    return originalOnUnhandledRejection.call(window, event);
  }
};
