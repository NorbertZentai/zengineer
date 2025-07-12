import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  imports: [CommonModule, FormsModule, TranslateModule, MatIconModule, RouterModule],
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
  isTestingConnection = false;
  
  // Validation errors
  validationErrors = {
    email: '',
    password: ''
  };

  constructor(
    private auth: AuthService, 
    private router: Router,
    private notificationService: NotificationService,
    private translate: TranslateService
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
        const errorMsg = authError?.message || 'LOGIN.ERROR.GENERAL';
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

  async testConnection() {
    this.isTestingConnection = true;
    
    console.log('=== BE/FE CONNECTION TEST START ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('User Agent:', navigator.userAgent);
    console.log('Page URL:', window.location.href);
    console.log('Protocol:', window.location.protocol);
    console.log('Host:', window.location.host);
    console.log('Port:', window.location.port);
    
    // Test environment detection
    const currentEnv = this.detectEnvironment();
    console.log('Detected Environment:', currentEnv);
    
    // Test translation service
    console.log('Translation Service Status:', {
      defaultLang: this.translate.getDefaultLang(),
      currentLang: this.translate.currentLang,
      availableLangs: this.translate.getLangs()
    });
    
    try {
      // Test 1: Basic API connectivity
      console.log('\n--- TEST 1: Basic API Health Check ---');
      const healthUrl = currentEnv.apiUrl + '/health';
      console.log('Health check URL:', healthUrl);
      
      try {
        const healthResponse = await fetch(healthUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        console.log('Health check status:', healthResponse.status);
        console.log('Health check headers:', Object.fromEntries(healthResponse.headers.entries()));
        
        if (healthResponse.ok) {
          const healthData = await healthResponse.text();
          console.log('Health check response:', healthData);
        } else {
          console.log('Health check failed with status:', healthResponse.status);
        }
      } catch (healthError) {
        console.log('Health check error:', healthError);
      }
      
      // Test 2: Collections endpoint
      console.log('\n--- TEST 2: Collections Endpoint ---');
      const collectionsUrl = currentEnv.apiUrl + '/collections';
      console.log('Collections URL:', collectionsUrl);
      
      try {
        const collectionsResponse = await fetch(collectionsUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        console.log('Collections status:', collectionsResponse.status);
        console.log('Collections headers:', Object.fromEntries(collectionsResponse.headers.entries()));
        
        if (collectionsResponse.ok) {
          const collectionsData = await collectionsResponse.json();
          console.log('Collections response:', collectionsData);
        } else {
          console.log('Collections failed with status:', collectionsResponse.status);
          const errorText = await collectionsResponse.text();
          console.log('Collections error text:', errorText);
        }
      } catch (collectionsError) {
        console.log('Collections error:', collectionsError);
      }
      
      // Test 3: Users collection info
      console.log('\n--- TEST 3: Users Collection Info ---');
      const usersUrl = currentEnv.apiUrl + '/collections/users';
      console.log('Users collection URL:', usersUrl);
      
      try {
        const usersResponse = await fetch(usersUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        console.log('Users collection status:', usersResponse.status);
        console.log('Users collection headers:', Object.fromEntries(usersResponse.headers.entries()));
        
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          console.log('Users collection response:', usersData);
        } else {
          console.log('Users collection failed with status:', usersResponse.status);
          const errorText = await usersResponse.text();
          console.log('Users collection error text:', errorText);
        }
      } catch (usersError) {
        console.log('Users collection error:', usersError);
      }
      
      // Test 4: Test registration endpoint
      console.log('\n--- TEST 4: Test Registration Endpoint (without actual registration) ---');
      const registerUrl = currentEnv.apiUrl + '/collections/users/records';
      console.log('Registration URL:', registerUrl);
      
      try {
        // Test with invalid data to see what error we get
        const testRegisterResponse = await fetch(registerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test@invalid',
            password: '123',
            passwordConfirm: '123',
            name: ''
          })
        });
        console.log('Test registration status:', testRegisterResponse.status);
        console.log('Test registration headers:', Object.fromEntries(testRegisterResponse.headers.entries()));
        
        const registerResponseText = await testRegisterResponse.text();
        console.log('Test registration response:', registerResponseText);
        
        try {
          const registerResponseJson = JSON.parse(registerResponseText);
          console.log('Test registration parsed:', registerResponseJson);
        } catch (parseError) {
          console.log('Could not parse registration response as JSON');
        }
        
      } catch (registerError) {
        console.log('Test registration error:', registerError);
      }
      
      // Test 5: Network info
      console.log('\n--- TEST 5: Network Information ---');
      console.log('Navigator online:', navigator.onLine);
      console.log('Connection type:', (navigator as any).connection?.effectiveType || 'unknown');
      console.log('Connection downlink:', (navigator as any).connection?.downlink || 'unknown');
      
      // Test 6: Local storage and cookies
      console.log('\n--- TEST 6: Storage Information ---');
      console.log('LocalStorage available:', typeof Storage !== 'undefined');
      console.log('Remembered email:', localStorage.getItem('rememberedEmail'));
      console.log('Language setting:', localStorage.getItem('lang'));
      console.log('Cookies:', document.cookie);
      
      console.log('\n=== BE/FE CONNECTION TEST END ===');
      
    } catch (error) {
      console.error('Connection test failed:', error);
    } finally {
      this.isTestingConnection = false;
    }
  }
  
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
}
