import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  // Optional translate params for title/message
  params?: Record<string, any>;
  duration?: number;
  persistent?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private toasts$ = new BehaviorSubject<ToastMessage[]>([]);
  
  constructor() {}
  
  get toasts() {
    return this.toasts$.asObservable();
  }
  
  show(toast: Omit<ToastMessage, 'id'>): string {
    const id = this.generateId();
    const newToast: ToastMessage = {
      id,
      duration: 20000, // Drastically increased to 20 seconds for testing
      ...toast
    };
    
    const currentToasts = this.toasts$.value;
    this.toasts$.next([...currentToasts, newToast]);
    
    // Auto-remove toast after duration (unless persistent)
    if (!newToast.persistent && newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, newToast.duration);
    }
    
    return id;
  }
  
  success(message: string, title?: string, options?: Partial<ToastMessage>): string {
    return this.show({
      type: 'success',
      title,
      message,
      duration: 20000, // Test with 20 seconds
      ...options
    });
  }
  
  error(message: string, title?: string, options?: Partial<ToastMessage>): string {
    return this.show({
      type: 'error',
      title,
      message,
      duration: 25000, // Test with 25 seconds for errors
      ...options
    });
  }
  
  warning(message: string, title?: string, options?: Partial<ToastMessage>): string {
    return this.show({
      type: 'warning',
      title,
      message,
      duration: 22000, // Test with 22 seconds for warnings
      ...options
    });
  }
  
  info(message: string, title?: string, options?: Partial<ToastMessage>): string {
    return this.show({
      type: 'info',
      title,
      message,
      duration: 20000, // Test with 20 seconds for info
      ...options
    });
  }
  
  remove(id: string): void {
    const currentToasts = this.toasts$.value;
    const remainingToasts = currentToasts.filter(toast => toast.id !== id);
    this.toasts$.next(remainingToasts);
  }
  
  clear(): void {
    this.toasts$.next([]);
  }
  
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}
