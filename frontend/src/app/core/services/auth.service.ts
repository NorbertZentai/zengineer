import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;
  private initPromise: Promise<void>;
  
  // Reactive state
  user = signal<User | null>(null);
  isAuthenticated = signal(false);
  isLoading = signal(false);

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    
    // Initialize auth state
    this.initPromise = this.initializeAuth();
  }

  private async initializeAuth() {
    // Check for existing session on page load/refresh
    const { data: { session } } = await this.supabase.auth.getSession();
    this.user.set(session?.user ?? null);
    this.isAuthenticated.set(!!session?.user);
    
    // Listen for auth changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.user.set(session?.user ?? null);
      this.isAuthenticated.set(!!session?.user);
    });
  }

  async signIn(email: string, password: string) {
    this.isLoading.set(true);
    
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    
    this.isLoading.set(false);
    
    if (error) throw error;
    return data;
  }

  async signUp(email: string, password: string) {
    this.isLoading.set(true);
    
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password
    });
    
    this.isLoading.set(false);
    
    if (error) throw error;
    return data;
  }

  async signOut() {
    this.isLoading.set(true);
    
    const { error } = await this.supabase.auth.signOut();
    
    this.isLoading.set(false);
    
    if (error) throw error;
  }

  async resetPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }

  async updateProfile(updates: { displayName?: string; avatar?: string }) {
    const { error } = await this.supabase.auth.updateUser({
      data: updates
    });
    
    if (error) throw error;
  }

  // Method to ensure initialization is complete
  async waitForInit(): Promise<void> {
    return this.initPromise;
  }

  // Kompatibilitási metódusok a régi API-val
  get currentUser() {
    return this.user();
  }

  async login(email: string, password: string) {
    try {
      const result = await this.signIn(email, password);
      return !!result;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  async register(email: string, password: string) {
    try {
      const result = await this.signUp(email, password);
      return !!result;
    } catch (error) {
      console.error('Register error:', error);
      return false;
    }
  }

  async logout() {
    try {
      await this.signOut();
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  lastError() {
    // Mock implementation - real error handling would store last error
    return null;
  }
}
