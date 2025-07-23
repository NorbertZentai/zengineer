import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_STORAGE_KEY = 'zengineer-theme';
  
  // Theme signal with initial value from localStorage or system preference
  public theme = signal<Theme>(this.getInitialTheme());
  
  constructor() {
    // Effect to apply theme changes to the DOM and localStorage
    effect(() => {
      const currentTheme = this.theme();
      this.applyTheme(currentTheme);
      localStorage.setItem(this.THEME_STORAGE_KEY, currentTheme);
    });
  }
  
  /**
   * Toggle between light and dark themes
   */
  public toggleTheme(): void {
    const currentTheme = this.theme();
    const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';
    this.theme.set(newTheme);
  }
  
  /**
   * Set a specific theme
   */
  public setTheme(theme: Theme): void {
    this.theme.set(theme);
  }
  
  /**
   * Get the current theme
   */
  public getCurrentTheme(): Theme {
    return this.theme();
  }
  
  /**
   * Check if current theme is dark
   */
  public isDarkTheme(): boolean {
    return this.theme() === 'dark';
  }
  
  /**
   * Get initial theme from localStorage or system preference
   */
  private getInitialTheme(): Theme {
    // Check localStorage first
    const storedTheme = localStorage.getItem(this.THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }
    
    // Fall back to system preference, but default to dark
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    
    return 'dark'; // Default to dark theme
  }
  
  /**
   * Apply theme to the DOM
   */
  private applyTheme(theme: Theme): void {
    const body = document.body;
    
    // Remove existing theme classes
    body.classList.remove('light-theme', 'dark-theme');
    
    // Add the new theme class
    body.classList.add(theme === 'dark' ? 'dark-theme' : 'light-theme');
    
    // Also set data-theme attribute for compatibility
    document.documentElement.setAttribute('data-theme', theme);
  }
}
