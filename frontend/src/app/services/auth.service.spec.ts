import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with not authenticated state', () => {
    expect(service.isLoading()).toBe(false);
    expect(service.lastError()).toBeNull();
  });

  it('should validate empty inputs for login', async () => {
    const result = await service.login('', '');
    
    expect(result).toBe(false);
    expect(service.lastError()).not.toBeNull();
    expect(service.lastError()?.code).toBe('INVALID_INPUT');
  });

  it('should validate empty inputs for register', async () => {
    const result = await service.register('', '', '');
    
    expect(result).toBe(false);
    expect(service.lastError()).not.toBeNull();
    expect(service.lastError()?.code).toBe('INVALID_INPUT');
  });

  it('should validate weak password', async () => {
    const result = await service.register('test@example.com', '123', 'Test User');
    
    expect(result).toBe(false);
    expect(service.lastError()?.code).toBe('WEAK_PASSWORD');
  });

  it('should clear errors', () => {
    // Set an error first by calling with invalid input
    service.register('', '', '');
    
    // Clear the error
    service.clearError();
    
    expect(service.lastError()).toBeNull();
  });
});
