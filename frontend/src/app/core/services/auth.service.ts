import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;
  
  // Reactive state
  user = signal<User | null>(null);
  isAuthenticated = signal(false);
  isLoading = signal(false);

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    
    // Initialize auth state
    this.initializeAuth();
  }

  private async initializeAuth() {
    const { data: { user } } = await this.supabase.auth.getUser();
    this.user.set(user);
    this.isAuthenticated.set(!!user);
    
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

  // Kompatibilitási metódusok a régi API-val
  get currentUser() {
    return this.user();
  }

  async login(email: string, password: string) {
    return await this.signIn(email, password);
  }

  async register(email: string, password: string) {
    return await this.signUp(email, password);
  }

  async logout() {
    return await this.signOut();
  }

  lastError() {
    // Mock implementation - real error handling would store last error
    return null;
  }
}
