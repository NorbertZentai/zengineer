import { Component, inject, computed } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [],
  template: `
    <button 
      [title]="tooltipText()"
      (click)="toggleTheme()"
      class="theme-toggle-btn"
      [class.dark-mode]="isDark()">
    </button>
  `,
  styles: [`
    .theme-toggle-btn {
      transition: all var(--transition-normal);
      border-radius: var(--radius-full);
      color: var(--text-secondary);
      background: none;
      border: none;
      cursor: pointer;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      
      &:hover {
        color: var(--text-primary);
        background: var(--hover-bg);
        transform: scale(1.05);
      }
      
      &.dark-mode {
        color: var(--primary);
        
        &::before {
          filter: drop-shadow(0 0 8px rgba(143, 167, 243, 0.3));
        }
      }
      
      &::before {
        content: "🌙";
        transition: all var(--transition-normal);
        font-size: 20px;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      &.dark-mode::before {
        content: "☀️";
      }
    }
  `]
})
export class ThemeToggleComponent {
  private themeService = inject(ThemeService);
  
  // Computed properties for reactive UI
  public isDark = computed(() => this.themeService.isDarkTheme());
  
  public tooltipText = computed(() => 
    `Switch to ${this.isDark() ? 'light' : 'dark'} theme`
  );
  
  /**
   * Toggle the theme
   */
  public toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
