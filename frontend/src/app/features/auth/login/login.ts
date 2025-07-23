import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
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

  async testConnection() {
    this.isTestingConnection = true;
    
    // Initialize result tracking variables
    let healthStatus = 0;
    let collectionsStatus = 0;
    let usersStatus = 0;
    let registrationStatus = 0;
    
    console.log('=== BE/FE CONNECTION TEST START ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('User Agent:', navigator.userAgent);
    console.log('Page URL:', window.location.href);
    console.log('Protocol:', window.location.protocol);
    console.log('Host:', window.location.host);
    console.log('Port:', window.location.port);
    
    // Test environment detection
    const environment = this.detectEnvironment();
    console.log('Detected Environment:', environment);
    
    // Test translation service
    console.log('Translation Service Status:', {
      defaultLang: this.translate.getDefaultLang(),
      currentLang: this.translate.currentLang,
      availableLangs: this.translate.getLangs()
    });
    
    try {
      // Test 1: Basic API connectivity
      console.log('\n--- TEST 1: Basic API Health Check ---');
      const healthUrl = environment.apiUrl + '/health';
      console.log('Health check URL:', healthUrl);
      
      try {
        const healthResponse = await fetch(healthUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        healthStatus = healthResponse.status;
        console.log('Health check status:', healthResponse.status);
        // console.log('Health check headers:', Array.from(healthResponse.headers));
        
        if (healthResponse.ok) {
          const healthData = await healthResponse.text();
          console.log('Health check response:', healthData);
        } else {
          console.log('Health check failed with status:', healthResponse.status);
        }
      } catch (healthError) {
        healthStatus = 0; // Connection failed
        console.log('Health check error:', healthError);
      }
      
      // Test 2: Collections endpoint
      console.log('\n--- TEST 2: Collections Endpoint ---');
      const collectionsUrl = environment.apiUrl + '/collections';
      console.log('Collections URL:', collectionsUrl);
      
      try {
        const collectionsResponse = await fetch(collectionsUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        collectionsStatus = collectionsResponse.status;
        console.log('Collections status:', collectionsResponse.status);
        // console.log('Collections headers:', Array.from(collectionsResponse.headers));
        
        if (collectionsResponse.ok) {
          const collectionsData = await collectionsResponse.json();
          console.log('Collections response:', collectionsData);
        } else {
          console.log('Collections failed with status:', collectionsResponse.status);
          const errorText = await collectionsResponse.text();
          console.log('Collections error text:', errorText);
        }
      } catch (collectionsError) {
        collectionsStatus = 0; // Connection failed
        console.log('Collections error:', collectionsError);
      }
      
      // Test 3: Users collection info
      console.log('\n--- TEST 3: Users Collection Info ---');
      const usersUrl = environment.apiUrl + '/collections/users';
      console.log('Users collection URL:', usersUrl);
      
      try {
        const usersResponse = await fetch(usersUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        usersStatus = usersResponse.status;
        console.log('Users collection status:', usersResponse.status);
        // console.log('Users collection headers:', Array.from(usersResponse.headers));
        
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          console.log('Users collection response:', usersData);
        } else {
          console.log('Users collection failed with status:', usersResponse.status);
          const errorText = await usersResponse.text();
          console.log('Users collection error text:', errorText);
        }
      } catch (usersError) {
        usersStatus = 0; // Connection failed
        console.log('Users collection error:', usersError);
      }
      
      // Test 4: Test registration endpoint
      console.log('\n--- TEST 4: Test Registration Endpoint (without actual registration) ---');
      const registerUrl = environment.apiUrl + '/collections/users/records';
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
        registrationStatus = testRegisterResponse.status;
        console.log('Test registration status:', testRegisterResponse.status);
        // console.log('Test registration headers:', Array.from(testRegisterResponse.headers));
        
        const registerResponseText = await testRegisterResponse.text();
        console.log('Test registration response:', registerResponseText);
        
        try {
          const registerResponseJson = JSON.parse(registerResponseText);
          console.log('Test registration parsed:', registerResponseJson);
        } catch (parseError) {
          console.log('Could not parse registration response as JSON');
        }
        
      } catch (registerError) {
        registrationStatus = 0; // Connection failed
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
      
      // Summary of results
      console.log('\n🎯 === DIAGNOSIS SUMMARY ===');
      console.log('Environment:', environment.isDocker ? 'Docker' : environment.isDevelopment ? 'Development' : 'Production');
      console.log('API Base URL:', environment.apiUrl);
      
      if (healthStatus === 200) {
        console.log('✅ HEALTH CHECK: WORKING - Backend is reachable and responding properly');
      } else if (healthStatus === 0) {
        console.log('❌ HEALTH CHECK: CONNECTION FAILED - Cannot reach backend server');
        console.log('   🔧 FIX: Check nginx proxy configuration, backend service status, and network connectivity');
      } else {
        console.log('❌ HEALTH CHECK: FAILED - Status:', healthStatus);
        console.log('   🔧 FIX: Check nginx proxy configuration and backend URL');
      }
      
      if (collectionsStatus === 401) {
        console.log('✅ COLLECTIONS ENDPOINT: WORKING - Properly returns 401 Unauthorized (expected for unauthenticated requests)');
      } else if (collectionsStatus === 200) {
        console.log('⚠️  COLLECTIONS ENDPOINT: UNEXPECTED - Got 200 OK instead of 401');
      } else if (collectionsStatus === 0) {
        console.log('❌ COLLECTIONS ENDPOINT: CONNECTION FAILED - Cannot reach endpoint');
        console.log('   🔧 FIX: Check API routing and network connectivity');
      } else {
        console.log('❌ COLLECTIONS ENDPOINT: FAILED - Status:', collectionsStatus);
        console.log('   🔧 FIX: Check API routing and authentication setup');
      }
      
      if (usersStatus === 401) {
        console.log('✅ USERS COLLECTION: WORKING - Properly returns 401 Unauthorized (expected for unauthenticated requests)');
      } else if (usersStatus === 200) {
        console.log('⚠️  USERS COLLECTION: UNEXPECTED - Got 200 OK instead of 401');
      } else if (usersStatus === 0) {
        console.log('❌ USERS COLLECTION: CONNECTION FAILED - Cannot reach endpoint');
        console.log('   🔧 FIX: Check users collection configuration and network connectivity');
      } else {
        console.log('❌ USERS COLLECTION: FAILED - Status:', usersStatus);
        console.log('   🔧 FIX: Check users collection configuration');
      }
      
      if (registrationStatus === 400) {
        console.log('✅ REGISTRATION ENDPOINT: WORKING - Properly returns 400 Bad Request (expected for invalid test data)');
      } else if (registrationStatus === 200 || registrationStatus === 201) {
        console.log('⚠️  REGISTRATION ENDPOINT: UNEXPECTED - Registration succeeded with test data');
      } else if (registrationStatus === 0) {
        console.log('❌ REGISTRATION ENDPOINT: CONNECTION FAILED - Cannot reach endpoint');
        console.log('   🔧 FIX: Check registration endpoint configuration and network connectivity');
      } else {
        console.log('❌ REGISTRATION ENDPOINT: FAILED - Status:', registrationStatus);
        console.log('   🔧 FIX: Check registration endpoint configuration and routing');
      }
      
      const workingCount = [healthStatus === 200, collectionsStatus === 401, usersStatus === 401, registrationStatus === 400].filter(Boolean).length;
      const connectionFailures = [healthStatus, collectionsStatus, usersStatus, registrationStatus].filter(status => status === 0).length;
      
      console.log(`\n📊 OVERALL RESULT: ${workingCount}/4 endpoints working correctly`);
      if (connectionFailures > 0) {
        console.log(`⚠️  CONNECTION ISSUES: ${connectionFailures}/4 endpoints had connection failures`);
      }
      
      if (workingCount === 4) {
        console.log('🎉 ALL SYSTEMS GO! Backend-Frontend communication is working perfectly!');
        console.log('✅ Registration should work now!');
      } else if (workingCount >= 2) {
        console.log('⚠️  PARTIAL SUCCESS: Some endpoints working, others need attention');
      } else if (connectionFailures >= 3) {
        console.log('🚨 MAJOR CONNECTION ISSUES: Most endpoints unreachable - check nginx configuration or backend service');
      } else {
        console.log('🚨 MAJOR ISSUES: Most endpoints failing - check nginx configuration');
      }
      console.log('=== END DIAGNOSIS ===\n');
      
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
