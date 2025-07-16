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
    
    // Fall back to system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  }
  
  /**
   * Apply theme to the DOM
   */
  private applyTheme(theme: Theme): void {
    const html = document.documentElement;
    
    // Remove any existing theme attributes
    html.removeAttribute('data-theme');
    
    // Set the new theme
    if (theme === 'dark') {
      html.setAttribute('data-theme', 'dark');
    }
    // For light theme, we don't need to set attribute as it's the default
  }
}
