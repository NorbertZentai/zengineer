import { Injectable, signal } from '@angular/core';
import PocketBase from 'pocketbase';
import { environment } from '../../environments/environment';

export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private pb = new PocketBase(environment.apiUrl);
  private _isLoading = signal(false);
  private _lastError = signal<AuthError | null>(null);

  // Public signals
  isLoading = this._isLoading.asReadonly();
  lastError = this._lastError.asReadonly();

  get isAuthenticated(): boolean {
    return this.pb.authStore.isValid;
  }

  get currentUser() {
    return this.pb.authStore.model;
  }

  clearError(): void {
    this._lastError.set(null);
  }

  async login(email: string, password: string): Promise<boolean> {
    if (!email?.trim() || !password?.trim()) {
      this._lastError.set({
        code: 'INVALID_INPUT',
        message: 'Email and password are required'
      });
      return false;
    }

    this._isLoading.set(true);
    this._lastError.set(null);
    
    try {
      await this.pb.collection('users').authWithPassword(email, password);
      return true;
    } catch (err: any) {
      const error: AuthError = {
        code: err?.status?.toString() || 'LOGIN_FAILED',
        message: err?.message || 'Login failed. Please check your credentials.',
        details: err
      };
      
      this._lastError.set(error);
      console.error('Login failed', err);
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async register(email: string, password: string, name: string): Promise<boolean> {
    if (!email?.trim() || !password?.trim() || !name?.trim()) {
      this._lastError.set({
        code: 'INVALID_INPUT',
        message: 'All fields are required'
      });
      return false;
    }

    if (password.length < 6) {
      this._lastError.set({
        code: 'WEAK_PASSWORD',
        message: 'Password must be at least 6 characters long'
      });
      return false;
    }

    this._isLoading.set(true);
    this._lastError.set(null);
    
    try {
      await this.pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name,
      });
      return true;
    } catch (err: any) {
      const error: AuthError = {
        code: err?.status?.toString() || 'REGISTRATION_FAILED',
        message: err?.message || 'Registration failed. Please try again.',
        details: err
      };
      
      this._lastError.set(error);
      console.error('Registration failed', err);
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  logout(): void {
    try {
      this.pb.authStore.clear();
      this._lastError.set(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  // Check if the current auth is valid and refresh if needed
  async validateAuth(): Promise<boolean> {
    if (!this.isAuthenticated) {
      return false;
    }

    try {
      await this.pb.collection('users').authRefresh();
      return true;
    } catch (err) {
      console.error('Auth validation failed:', err);
      this.logout();
      return false;
    }
  }
}