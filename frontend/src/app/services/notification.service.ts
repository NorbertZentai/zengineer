import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
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
      duration: 5000,
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
      ...options
    });
  }
  
  error(message: string, title?: string, options?: Partial<ToastMessage>): string {
    return this.show({
      type: 'error',
      title,
      message,
      duration: 8000, // Longer duration for errors
      ...options
    });
  }
  
  warning(message: string, title?: string, options?: Partial<ToastMessage>): string {
    return this.show({
      type: 'warning',
      title,
      message,
      ...options
    });
  }
  
  info(message: string, title?: string, options?: Partial<ToastMessage>): string {
    return this.show({
      type: 'info',
      title,
      message,
      ...options
    });
  }
  
  remove(id: string): void {
    const currentToasts = this.toasts$.value;
    this.toasts$.next(currentToasts.filter(toast => toast.id !== id));
  }
  
  clear(): void {
    this.toasts$.next([]);
  }
  
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}
