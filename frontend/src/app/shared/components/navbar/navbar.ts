import { Component, OnInit, inject, computed, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class NavbarComponent implements OnInit {
  authInitialized = false;
  showUserDropdown = false;
  showLanguageDropdown = false;
  unreadNotifications = 0;
  currentLanguage = 'hu';
  availableLanguages = ['hu', 'en'];
  isMobileMenuOpen = false;
  
  private themeService = inject(ThemeService);
  private ngZone = inject(NgZone);
  
  // Computed properties for theme
  public currentTheme = computed(() => this.themeService.getCurrentTheme());
  public isDarkTheme = computed(() => this.themeService.isDarkTheme());
  public isDarkMode = computed(() => this.themeService.isDarkTheme());

  private documentClickHandler: any;

  constructor(
    private auth: AuthService,
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
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.documentClickHandler);
  }

  handleDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const langAction = document.querySelector('.navbar-lang');
    const userAction = document.querySelector('.navbar-user');
    const dropdowns = document.querySelectorAll('.navbar-dropdown');
    // If click is outside any dropdown or action, close all
    if (
      (!langAction || !langAction.contains(target)) &&
      (!userAction || !userAction.contains(target)) &&
      !Array.from(dropdowns).some(dropdown => dropdown.contains(target))
    ) {
      this.ngZone.run(() => this.closeDropdowns());
    }
  }

  isLoggedIn(): boolean {
    return this.authInitialized && this.auth.isAuthenticated();
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
    console.log('Toggle notifications');
  }

  toggleUserDropdown() {
    this.showUserDropdown = !this.showUserDropdown;
    if (this.showUserDropdown) {
      this.showLanguageDropdown = false;
    }
  }

  toggleLanguage() {
    this.showLanguageDropdown = !this.showLanguageDropdown;
    if (this.showLanguageDropdown) {
      this.showUserDropdown = false;
    }
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
    }
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
    this.closeDropdowns();
  }
}