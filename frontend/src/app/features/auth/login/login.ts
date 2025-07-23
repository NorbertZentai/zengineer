import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ThemeService } from '../../../core/services/theme.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  imports: [CommonModule, FormsModule, TranslateModule, RouterModule],
})

export class Login {
  email = '';
  password = '';
  errorMessage: string | null = null;
  isLoading = false;
  showPassword = false;
  rememberMe = false;
  showForgotPasswordModal = false;
  forgotPasswordEmail = '';
  isSendingReset = false;
  resetEmailSent = false;
  forgotPasswordError: string | null = null;
  
  // Validation errors
  validationErrors = {
    email: '',
    password: ''
  };

  constructor(
    private auth: AuthService, 
    private router: Router,
    private notificationService: NotificationService,
    private translate: TranslateService,
    public themeService: ThemeService
  ) {
    // Check if user was remembered
    this.loadRememberedUser();
  }

  loadRememberedUser() {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      this.email = rememberedEmail;
      this.rememberMe = true;
    }
  }

  saveRememberedUser() {
    if (this.rememberMe && this.email) {
      localStorage.setItem('rememberedEmail', this.email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  validateEmail() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!this.email.trim()) {
      this.validationErrors.email = 'LOGIN.VALIDATION.EMAIL_REQUIRED';
      return false;
    }
    if (!emailRegex.test(this.email)) {
      this.validationErrors.email = 'LOGIN.VALIDATION.EMAIL_INVALID';
      return false;
    }
    this.validationErrors.email = '';
    return true;
  }

  validatePassword() {
    if (!this.password) {
      this.validationErrors.password = 'LOGIN.VALIDATION.PASSWORD_REQUIRED';
      return false;
    }
    this.validationErrors.password = '';
    return true;
  }

  onEmailBlur() {
    this.validateEmail();
  }

  onPasswordBlur() {
    this.validatePassword();
  }

  validateForm(): boolean {
    const isEmailValid = this.validateEmail();
    const isPasswordValid = this.validatePassword();
    
    return isEmailValid && isPasswordValid;
  }

  isFormValid(): boolean {
    return this.email.trim() !== '' && this.password !== '' && 
           !this.validationErrors.email && !this.validationErrors.password;
  }

  async onSubmit() {
    if (this.isLoading) return;
    
    // Clear previous errors
    this.errorMessage = null;
    
    // Validate form
    if (!this.validateForm()) {
      this.errorMessage = 'LOGIN.VALIDATION.FORM_INVALID';
      return;
    }
    
    this.isLoading = true;
    
    try {
      const success = await this.auth.login(this.email, this.password);
      if (success) {
        // Save remember me preference
        this.saveRememberedUser();
        this.notificationService.success('LOGIN.SUCCESS', 'LOGIN.WELCOME_BACK');
        this.router.navigateByUrl('/dashboard');
      } else {
        // Use the error from AuthService if available
        const authError = this.auth.lastError();
        const errorMsg = (authError && typeof authError === 'object' && 'message' in authError) 
          ? (authError as any).message 
          : 'LOGIN.ERROR.GENERAL';
        this.errorMessage = errorMsg;
        this.notificationService.error(errorMsg, 'LOGIN.ERROR.TITLE');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      this.errorMessage = 'LOGIN.ERROR.GENERAL';
      this.notificationService.error('LOGIN.ERROR.GENERAL', 'LOGIN.ERROR.TITLE');
    } finally {
      this.isLoading = false;
    }
  }

  onForgotPassword(event: Event) {
    event.preventDefault();
    this.showForgotPasswordModal = true;
    this.forgotPasswordEmail = this.email; // Pre-fill with current email
    this.resetEmailSent = false;
    this.forgotPasswordError = null;
  }

  closeForgotPasswordModal() {
    this.showForgotPasswordModal = false;
    this.forgotPasswordEmail = '';
    this.resetEmailSent = false;
    this.forgotPasswordError = null;
    this.isSendingReset = false;
  }

  async sendPasswordReset() {
    if (!this.forgotPasswordEmail.trim()) {
      this.forgotPasswordError = 'LOGIN.VALIDATION.EMAIL_REQUIRED';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.forgotPasswordEmail)) {
      this.forgotPasswordError = 'LOGIN.VALIDATION.EMAIL_INVALID';
      return;
    }

    this.isSendingReset = true;
    this.forgotPasswordError = null;

    try {
      // TODO: Implement password reset in AuthService
      // await this.auth.requestPasswordReset(this.forgotPasswordEmail);
      
      // For now, simulate the request
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      this.resetEmailSent = true;
      this.notificationService.success('LOGIN.FORGOT_PASSWORD_MODAL.SUCCESS');
      
      // Close modal after 3 seconds
      setTimeout(() => {
        this.closeForgotPasswordModal();
      }, 3000);
      
    } catch (error) {
      console.error('Password reset error:', error);
      this.forgotPasswordError = 'LOGIN.FORGOT_PASSWORD_MODAL.ERROR';
      this.notificationService.error('LOGIN.FORGOT_PASSWORD_MODAL.ERROR');
    } finally {
      this.isSendingReset = false;
    }
  }

  
  // Environment detection utility
  private detectEnvironment() {
    const apiUrl = window.location.origin;
    const isDocker = apiUrl.includes('localhost:3000') || apiUrl.includes(':3000');
    const isDevelopment = apiUrl.includes('localhost:4200') || apiUrl.includes(':4200');
    
    let detectedApiUrl = '';
    if (isDocker) {
      detectedApiUrl = '/api'; // Docker nginx proxy
    } else if (isDevelopment) {
      detectedApiUrl = 'http://localhost:8080/api'; // Development direct
    } else {
      detectedApiUrl = '/api'; // Production
    }
    
    return {
      currentUrl: window.location.href,
      apiUrl: detectedApiUrl,
      isDocker,
      isDevelopment,
      isProduction: !isDocker && !isDevelopment
    };
  }

  // Theme functions for testing
  toggleTheme() {
    this.themeService.toggleTheme();
  }

  isDarkTheme() {
    return this.themeService.isDarkTheme();
  }
}
