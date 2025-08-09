import { Component, OnInit, OnDestroy, inject, computed, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { AiService } from '../../../core/services/ai.service';
import { ThemeService } from '../../../core/services/theme.service';
import { QuizImportModalComponent } from '../../../features/quiz-manager/quiz-import-modal/quiz-import-modal.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, QuizImportModalComponent],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  showImportModal = false;

  onImport() {
    this.closeDropdowns();
    this.showImportModal = true;
  }

  handleImportModalClose() {
    this.showImportModal = false;
  }

  handleQuizImported(event: any) {
    // TODO: handle imported quiz (event contains file/code)
    this.showImportModal = false;
  }
  authInitialized = false;
  showUserDropdown = false;
  showLanguageDropdown = false;
  showCreateDropdown = false;
  unreadNotifications = 0;
  currentLanguage = 'hu';
  availableLanguages = ['hu', 'en'];
  isMobileMenuOpen = false;
  // AI usage
  aiRemaining: number | null = null;
  aiLimit: number | null = null;
  aiResetAt: number | null = null;
  aiResetTz: string | null = null;
  aiCountdown: string | null = null;
  private countdownInterval: any;
  
  private themeService = inject(ThemeService);
  private ngZone = inject(NgZone);
  
  // Computed properties for theme
  public currentTheme = computed(() => this.themeService.getCurrentTheme());
  public isDarkTheme = computed(() => this.themeService.isDarkTheme());

  private documentClickHandler: any;
  private usageSub: any;

  constructor(
  private auth: AuthService,
  private ai: AiService,
    private router: Router,
    public translate: TranslateService
  ) {
    this.currentLanguage = this.translate.currentLang || 'hu';
  }

  async ngOnInit() {
    // Wait for auth initialization
    await this.auth.waitForInit();
    this.authInitialized = true;
    
    // Set initial language
    this.currentLanguage = this.translate.currentLang || 'hu';

    this.documentClickHandler = this.handleDocumentClick.bind(this);
    document.addEventListener('click', this.documentClickHandler);

    await this.refreshAiHealth();

    // Subscribe to usage updates to refresh counter
    this.usageSub = this.ai.usageUpdated$.subscribe(() => {
      this.refreshAiHealth();
    });
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.documentClickHandler);
    if (this.usageSub) {
      this.usageSub.unsubscribe();
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    
    // Restore body scroll when component is destroyed
    document.body.style.overflow = '';
  }

  private async refreshAiHealth() {
    try {
      const user = this.auth.currentUser;
      const health = await this.ai.getHealth(user?.id);
      this.aiRemaining = health.remaining;
      this.aiLimit = health.limit;
      this.aiResetAt = health.resetAt ?? null;
      this.aiResetTz = health.resetTz ?? null;
      this.startCountdown();
    } catch (_) {
      // ignore failures
    }
  }

  private startCountdown() {
    if (!this.aiResetAt) {
      this.aiCountdown = null;
      if (this.countdownInterval) clearInterval(this.countdownInterval);
      return;
    }
    const update = () => {
      const ms = this.aiResetAt! - Date.now();
      if (ms <= 0) {
        this.aiCountdown = '0:00:00';
        clearInterval(this.countdownInterval);
        return;
      }
      const totalSec = Math.floor(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      this.aiCountdown = `${String(h)}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    update();
    this.countdownInterval = setInterval(update, 1000);
  }

  handleDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const langAction = document.querySelector('.navbar-lang');
    const userAction = document.querySelector('.navbar-user');
    const createAction = document.querySelector('.navbar-create');
    const dropdowns = document.querySelectorAll('.navbar-dropdown');
    // If click is outside any dropdown or action, close all
    if (
      (!langAction || !langAction.contains(target)) &&
      (!userAction || !userAction.contains(target)) &&
      (!createAction || !createAction.contains(target)) &&
      !Array.from(dropdowns).some(dropdown => dropdown.contains(target))
    ) {
      this.ngZone.run(() => this.closeDropdowns());
    }
  }

  isLoggedIn(): boolean {
    return this.authInitialized && this.auth.getAuthenticationStatus();
  }

  // Tesztelési célú bejelentkezés
  mockLogin() {
    this.auth.mockLogin();
  }

  async logout() {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
    this.closeDropdowns();
  }

  getUserInitials(): string {
    // Mock implementation - replace with actual user data
    return 'U';
  }

  toggleNotifications() {
    // Mock implementation - replace with actual notification handling
    // ...existing code...
  }

  toggleUserDropdown() {
    this.showUserDropdown = !this.showUserDropdown;
    if (this.showUserDropdown) {
      this.showLanguageDropdown = false;
      this.showCreateDropdown = false;
    }
  }

  toggleCreateDropdown() {
    this.showCreateDropdown = !this.showCreateDropdown;
    if (this.showCreateDropdown) {
      this.showUserDropdown = false;
      this.showLanguageDropdown = false;
    }
  }

  toggleLanguage() {
    // ...existing code...
    this.showLanguageDropdown = !this.showLanguageDropdown;
    if (this.showLanguageDropdown) {
      this.showUserDropdown = false;
      this.showCreateDropdown = false;
    }
    // ...existing code...
  }

  selectLanguage(lang: string) {
    this.currentLanguage = lang;
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
    this.closeDropdowns();
  }

  closeDropdowns() {
    this.showUserDropdown = false;
    this.showLanguageDropdown = false;
    this.showCreateDropdown = false;
  }

  changeLang(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.selectLanguage(value);
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    if (!this.isMobileMenuOpen) {
      this.closeDropdowns();
      // Restore body scroll
      document.body.style.overflow = '';
    } else {
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    }
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
    this.closeDropdowns();
    
    // Ensure body scroll is restored when menu closes
    document.body.style.overflow = '';
  }

  // Mobile theme check method for template
  isDarkMode() {
    return this.themeService.isDarkTheme();
  }
}