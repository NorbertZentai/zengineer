import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslateModule } from '@ngx-translate/core';
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
  
  // Password validation states
  passwordRequirements = {
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  };
  
  // Validation errors
  validationErrors = {
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  constructor(private auth: AuthService, private router: Router) {}

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
    
    // Update password requirements
    this.passwordRequirements.length = password.length >= 8;
    this.passwordRequirements.uppercase = /[A-Z]/.test(password);
    this.passwordRequirements.lowercase = /[a-z]/.test(password);
    this.passwordRequirements.number = /\d/.test(password);
    this.passwordRequirements.special = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
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
      this.errorMessage = 'REGISTER.VALIDATION.FORM_INVALID';
      return;
    }
    
    this.isLoading = true;
    
    try {
      const success = await this.auth.register(this.email, this.password, this.name);
      if (success) {
        // Auto login after successful registration
        const loginSuccess = await this.auth.login(this.email, this.password);
        if (loginSuccess) {
          this.router.navigateByUrl('/dashboard');
        } else {
          // If auto login fails, redirect to login page
          this.router.navigateByUrl('/login');
        }
      } else {
        // Use the error from AuthService if available
        const authError = this.auth.lastError();
        this.errorMessage = authError?.message || 'REGISTER.ERROR.GENERAL';
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      this.errorMessage = 'REGISTER.ERROR.GENERAL';
    } finally {
      this.isLoading = false;
    }
  }
}