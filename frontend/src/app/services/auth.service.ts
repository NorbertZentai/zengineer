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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this._lastError.set({
        code: 'INVALID_EMAIL',
        message: 'Please enter a valid email address'
      });
      return false;
    }

    // Validate password strength
    if (password.length < 8) {
      this._lastError.set({
        code: 'WEAK_PASSWORD',
        message: 'Password must be at least 8 characters long'
      });
      return false;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      this._lastError.set({
        code: 'WEAK_PASSWORD',
        message: 'Password must contain uppercase, lowercase, number, and special character'
      });
      return false;
    }

    // Validate name length
    if (name.trim().length < 2) {
      this._lastError.set({
        code: 'INVALID_NAME',
        message: 'Name must be at least 2 characters long'
      });
      return false;
    }

    if (name.trim().length > 50) {
      this._lastError.set({
        code: 'INVALID_NAME',
        message: 'Name can be maximum 50 characters long'
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
        name: name.trim(),
      });
      return true;
    } catch (err: any) {
      let errorMessage = 'Registration failed. Please try again.';
      
      // Handle specific PocketBase errors
      if (err?.data?.data) {
        const errors = err.data.data;
        if (errors.email) {
          errorMessage = 'This email is already registered.';
        } else if (errors.password) {
          errorMessage = 'Password does not meet requirements.';
        } else if (errors.name) {
          errorMessage = 'Invalid name format.';
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      const error: AuthError = {
        code: err?.status?.toString() || 'REGISTRATION_FAILED',
        message: errorMessage,
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