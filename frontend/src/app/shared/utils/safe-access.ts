// Angular helper utilities for safe property access
export function safeAccess<T>(obj: T | undefined | null): T | {} {
  return obj || {} as T;
}

export function safeArray<T>(arr: T[] | undefined | null): T[] {
  return arr || [];
}

export function safeString(str: string | undefined | null): string {
  return str || '';
}

export function safeNumber(num: number | undefined | null): number {
  return num || 0;
}

export function safeDate(date: Date | string | undefined | null): Date {
  if (!date) return new Date();
  return typeof date === 'string' ? new Date(date) : date;
}
