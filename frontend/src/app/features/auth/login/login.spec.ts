import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { Login } from './login';
import { AuthService } from '../../services/auth.service';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    // Create spies
    const authSpy = jasmine.createSpyObj('AuthService', ['login'], {
      isLoading: signal(false),
      lastError: signal(null)
    });
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigateByUrl']);

    await TestBed.configureTestingModule({
      imports: [
        Login, 
        FormsModule, 
        TranslateModule.forRoot(),
        MatIconModule,
        RouterModule.forRoot([])
      ],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpyObj }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render login form with email and password fields', () => {
    const emailInput = fixture.debugElement.query(By.css('input[type="email"]'));
    const passwordInput = fixture.debugElement.query(By.css('input[type="password"]'));
    const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));

    expect(emailInput).toBeTruthy();
    expect(passwordInput).toBeTruthy();
    expect(submitButton).toBeTruthy();
  });

  it('should bind email and password to component properties', async () => {
    // Arrange
    const emailInput = fixture.debugElement.query(By.css('input[type="email"]'));
    const passwordInput = fixture.debugElement.query(By.css('input[type="password"]'));
    
    // Act
    emailInput.nativeElement.value = 'test@example.com';
    emailInput.nativeElement.dispatchEvent(new Event('input'));
    
    passwordInput.nativeElement.value = 'password123';
    passwordInput.nativeElement.dispatchEvent(new Event('input'));
    
    fixture.detectChanges();
    await fixture.whenStable();

    // Assert
    expect(component.email).toBe('test@example.com');
    expect(component.password).toBe('password123');
  });

  it('should call authService.login on form submit', async () => {
    // Arrange
    component.email = 'test@example.com';
    component.password = 'password123';
    authServiceSpy.login.and.returnValue(Promise.resolve(true));

    // Act
    await component.onSubmit();

    // Assert
    expect(authServiceSpy.login).toHaveBeenCalledWith(
      'test@example.com',
      'password123'
    );
  });

  it('should navigate to dashboard on successful login', async () => {
    // Arrange
    component.email = 'test@example.com';
    component.password = 'password123';
    authServiceSpy.login.and.returnValue(Promise.resolve(true));

    // Act
    await component.onSubmit();

    // Assert
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('should display error message on login failure', async () => {
    // Arrange
    const errorMessage = 'Invalid credentials';
    component.email = 'test@example.com';
    component.password = 'wrongpassword';
    authServiceSpy.login.and.returnValue(Promise.resolve(false));
    authServiceSpy.lastError.and.returnValue({ code: 'LOGIN_FAILED', message: errorMessage });

    // Act
    await component.onSubmit();
    fixture.detectChanges();

    // Assert
    expect(component.error).toBe(errorMessage);
  });

  it('should show loading state during login', async () => {
    // Arrange
    component.email = 'test@example.com';
    component.password = 'password123';
    
    // Return a pending promise to simulate loading
    let resolveLogin: (value: boolean) => void;
    const loginPromise = new Promise<boolean>((resolve) => {
      resolveLogin = resolve;
    });
    authServiceSpy.login.and.returnValue(loginPromise);

    // Act
    const submitPromise = component.onSubmit();
    
    // Assert loading state
    expect(component.isLoading).toBeTrue();
    
    // Complete the login
    resolveLogin!(true);
    await submitPromise;
    
    expect(component.isLoading).toBeFalse();
  });

  it('should prevent multiple submissions while loading', async () => {
    // Arrange
    component.email = 'test@example.com';
    component.password = 'password123';
    component.isLoading = true;

    // Act
    await component.onSubmit();

    // Assert
    expect(authServiceSpy.login).not.toHaveBeenCalled();
  });
});
