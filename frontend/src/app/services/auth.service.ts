import { Injectable, signal } from '@angular/core';
import PocketBase from 'pocketbase';
import { environment } from '../../environments/environment';
import { TranslateService } from '@ngx-translate/core';

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

  constructor(private translate: TranslateService) {}

  // Helper method to get translated message
  private getTranslatedMessage(key: string): string {
    return this.translate.instant(key);
  }

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
        message: this.getTranslatedMessage('ERRORS.VALIDATION_ERROR')
      });
      return false;
    }

    this._isLoading.set(true);
    this._lastError.set(null);
    
    try {
      // Workaround for PocketBase API change - use identity instead of email
      const response = await fetch(`/api/collections/users/auth-with-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identity: email,
          password: password
        })
      });

      if (!response.ok) {
        let errorMessage = this.getTranslatedMessage('ERRORS.LOGIN_FAILED');
        
        if (response.status === 400) {
          errorMessage = this.getTranslatedMessage('ERRORS.LOGIN_FAILED');
        } else if (response.status === 401) {
          errorMessage = this.getTranslatedMessage('ERRORS.LOGIN_FAILED');
        } else if (response.status >= 500) {
          errorMessage = this.getTranslatedMessage('ERRORS.SERVER_ERROR');
        }
        
        throw new Error(errorMessage);
      }

      const authData = await response.json();
      
      // Manually set auth store
      this.pb.authStore.save(authData.token, authData.record);
      
      return true;
    } catch (err: any) {
      const error: AuthError = {
        code: err?.status?.toString() || 'LOGIN_FAILED',
        message: err?.message || this.getTranslatedMessage('ERRORS.LOGIN_FAILED'),
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
        message: this.getTranslatedMessage('ERRORS.VALIDATION_ERROR')
      });
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this._lastError.set({
        code: 'INVALID_EMAIL',
        message: this.getTranslatedMessage('ERRORS.VALIDATION_ERROR')
      });
      return false;
    }

    // Validate password strength
    if (password.length < 8) {
      this._lastError.set({
        code: 'WEAK_PASSWORD',
        message: this.getTranslatedMessage('ERRORS.WEAK_PASSWORD')
      });
      return false;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      this._lastError.set({
        code: 'WEAK_PASSWORD',
        message: this.getTranslatedMessage('ERRORS.WEAK_PASSWORD')
      });
      return false;
    }

    // Validate name length
    if (name.trim().length < 2) {
      this._lastError.set({
        code: 'INVALID_NAME',
        message: this.getTranslatedMessage('ERRORS.INVALID_NAME')
      });
      return false;
    }

    if (name.trim().length > 50) {
      this._lastError.set({
        code: 'INVALID_NAME',
        message: this.getTranslatedMessage('ERRORS.INVALID_NAME')
      });
      return false;
    }

    this._isLoading.set(true);
    this._lastError.set(null);
    
    try {
      // Use custom fetch for registration to match PocketBase API
      const response = await fetch(`/api/collections/users/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          passwordConfirm: password,
          name: name.trim(),
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Registration error response:', errorData);
        
        // Check for specific email uniqueness error
        if (errorData.data?.email?.code === 'validation_not_unique') {
          throw new Error('EMAIL_EXISTS');
        }
        
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (err: any) {
      let errorMessage = this.getTranslatedMessage('ERRORS.REGISTRATION_FAILED');
      let errorCode = 'REGISTRATION_FAILED';
      
      console.error('Registration error:', err);
      
      // Handle specific error types
      if (err.message === 'EMAIL_EXISTS') {
        errorCode = 'EMAIL_EXISTS';
        errorMessage = this.getTranslatedMessage('ERRORS.EMAIL_EXISTS');
      } else if (err.message && err.message.includes('HTTP 400')) {
        errorCode = 'VALIDATION_ERROR';
        errorMessage = this.getTranslatedMessage('ERRORS.EMAIL_EXISTS');
      } else if (err.message && err.message.includes('HTTP 422')) {
        errorCode = 'VALIDATION_ERROR';
        errorMessage = this.getTranslatedMessage('ERRORS.VALIDATION_ERROR');
      } else if (err.message && err.message.includes('HTTP 409')) {
        errorCode = 'EMAIL_EXISTS';
        errorMessage = this.getTranslatedMessage('ERRORS.EMAIL_EXISTS');
      } else if (err.message && err.message.includes('HTTP')) {
        errorMessage = this.translate.instant('ERRORS.SERVER_ERROR');
      }
      
      // Handle specific PocketBase errors (fallback for SDK errors)
      if (err?.data?.data) {
        const errors = err.data.data;
        if (errors.email) {
          errorCode = 'EMAIL_EXISTS';
          errorMessage = this.translate.instant('ERRORS.EMAIL_EXISTS');
        } else if (errors.password) {
          errorCode = 'WEAK_PASSWORD';
          errorMessage = this.translate.instant('ERRORS.WEAK_PASSWORD');
        } else if (errors.name) {
          errorCode = 'INVALID_NAME';
          errorMessage = this.translate.instant('ERRORS.INVALID_NAME');
        }
      }
      
      const error: AuthError = {
        code: errorCode,
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