import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  selector: 'app-register',
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  imports: [CommonModule, FormsModule, TranslateModule, MatIconModule, RouterModule],
})
export class Register {
  email = '';
  password = '';
  confirmPassword = '';
  name = '';
  errorMessage: string | null = null;
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  
  // Password validation states - simplified requirements
  passwordRequirements = {
    length: false,
    uppercase: false,
    lowercase: false,
    number: false
  };
  
  // Password strength (0-100%)
  passwordStrength = 0;
  
  // Validation errors
  validationErrors = {
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  constructor(
    private auth: AuthService, 
    private router: Router,
    private notificationService: NotificationService,
    private translate: TranslateService
  ) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  validateName() {
    if (!this.name.trim()) {
      this.validationErrors.name = 'REGISTER.VALIDATION.NAME_REQUIRED';
      return false;
    }
    if (this.name.trim().length < 2) {
      this.validationErrors.name = 'REGISTER.VALIDATION.NAME_TOO_SHORT';
      return false;
    }
    if (this.name.trim().length > 50) {
      this.validationErrors.name = 'REGISTER.VALIDATION.NAME_TOO_LONG';
      return false;
    }
    this.validationErrors.name = '';
    return true;
  }

  validateEmail() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!this.email.trim()) {
      this.validationErrors.email = 'REGISTER.VALIDATION.EMAIL_REQUIRED';
      return false;
    }
    if (!emailRegex.test(this.email)) {
      this.validationErrors.email = 'REGISTER.VALIDATION.EMAIL_INVALID';
      return false;
    }
    this.validationErrors.email = '';
    return true;
  }

  validatePassword() {
    const password = this.password;
    
    // Update password requirements - simplified (6 chars, upper, lower, number)
    this.passwordRequirements.length = password.length >= 6;
    this.passwordRequirements.uppercase = /[A-Z]/.test(password);
    this.passwordRequirements.lowercase = /[a-z]/.test(password);
    this.passwordRequirements.number = /\d/.test(password);
    
    // Calculate password strength (0-100%)
    this.calculatePasswordStrength();
    
    const allRequirementsMet = Object.values(this.passwordRequirements).every(req => req);
    
    if (!password) {
      this.validationErrors.password = 'REGISTER.VALIDATION.PASSWORD_REQUIRED';
      return false;
    }
    if (!allRequirementsMet) {
      this.validationErrors.password = 'REGISTER.VALIDATION.PASSWORD_WEAK';
      return false;
    }
    
    this.validationErrors.password = '';
    return true;
  }
  
  calculatePasswordStrength() {
    const password = this.password;
    let strength = 0;
    
    // Length scoring (up to 40 points)
    if (password.length >= 6) strength += 25;
    if (password.length >= 8) strength += 10;
    if (password.length >= 12) strength += 5;
    
    // Character type scoring (20 points each)
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[a-z]/.test(password)) strength += 20;
    if (/\d/.test(password)) strength += 20;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 15;
    
    this.passwordStrength = Math.min(100, strength);
  }

  validateConfirmPassword() {
    if (!this.confirmPassword) {
      this.validationErrors.confirmPassword = 'REGISTER.VALIDATION.CONFIRM_PASSWORD_REQUIRED';
      return false;
    }
    if (this.password !== this.confirmPassword) {
      this.validationErrors.confirmPassword = 'REGISTER.VALIDATION.PASSWORDS_DONT_MATCH';
      return false;
    }
    this.validationErrors.confirmPassword = '';
    return true;
  }

  onPasswordInput() {
    this.validatePassword();
    if (this.confirmPassword) {
      this.validateConfirmPassword();
    }
  }

  onConfirmPasswordInput() {
    this.validateConfirmPassword();
  }

  onNameBlur() {
    this.validateName();
  }

  onEmailBlur() {
    this.validateEmail();
  }

  validateForm(): boolean {
    const isNameValid = this.validateName();
    const isEmailValid = this.validateEmail();
    const isPasswordValid = this.validatePassword();
    const isConfirmPasswordValid = this.validateConfirmPassword();
    
    return isNameValid && isEmailValid && isPasswordValid && isConfirmPasswordValid;
  }

  async onSubmit() {
    if (this.isLoading) return;
    
    // Clear previous errors
    this.errorMessage = null;
    
    // Validate form
    if (!this.validateForm()) {
      this.errorMessage = this.translate.instant('REGISTER.VALIDATION.FORM_INVALID');
      return;
    }
    
    this.isLoading = true;
    
    try {
      const success = await this.auth.register(this.email, this.password);
      if (success) {
        this.notificationService.success('REGISTER.SUCCESS', 'REGISTER.WELCOME');
        
        // Redirect to login page after successful registration
        this.notificationService.info('REGISTER.LOGIN_REQUIRED');
        this.router.navigateByUrl('/login');
      } else {
        // Use the error from AuthService if available
        const authError = this.auth.lastError();
        const errorMsg = (authError as any)?.message || this.translate.instant('REGISTER.ERROR.GENERAL');
        this.errorMessage = errorMsg;
        this.notificationService.error((authError as any)?.message || 'REGISTER.ERROR.GENERAL', 'REGISTER.ERROR.TITLE');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      const errorKey = 'REGISTER.ERROR.GENERAL';
      this.errorMessage = this.translate.instant(errorKey);
      this.notificationService.error(errorKey, 'REGISTER.ERROR.TITLE');
    } finally {
      this.isLoading = false;
    }
  }
  
  getStrengthClass(): string {
    if (this.passwordStrength < 30) return 'weak';
    if (this.passwordStrength < 60) return 'medium';
    if (this.passwordStrength < 80) return 'good';
    return 'strong';
  }
  
  getStrengthText(): string {
    if (this.passwordStrength < 30) return 'REGISTER.STRENGTH.WEAK';
    if (this.passwordStrength < 60) return 'REGISTER.STRENGTH.MEDIUM';
    if (this.passwordStrength < 80) return 'REGISTER.STRENGTH.GOOD';
    return 'REGISTER.STRENGTH.STRONG';
  }
}