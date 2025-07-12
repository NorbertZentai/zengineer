import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { AuthService } from './core/services/auth.service';
import { Router } from '@angular/router';
import { CommonModule  } from '@angular/common';
import { NavbarComponent } from './shared/components/navbar/navbar';
import { ToastNotification } from './shared/components/toast-notification/toast-notification';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TranslateModule, CommonModule, NavbarComponent, ToastNotification],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  protected title = 'zengineer';
  public translationsLoaded = false;

  constructor(private translate: TranslateService, private auth: AuthService, private router: Router) {
    this.initializeTranslations();
  }

  async initializeTranslations() {
    // Initialize languages
    this.translate.addLangs(['en', 'hu']);
    this.translate.setDefaultLang('hu');

    // Determine language to use
    const savedLang = localStorage.getItem('lang');
    const browserLang = this.translate.getBrowserLang();
    const langToUse = savedLang || (browserLang?.match(/en|hu/) ? browserLang : 'hu');

    // Wait for translation files to load in Docker environment
    if (window.location.pathname.startsWith('/')) {
      try {
        await this.translate.use(langToUse).toPromise();
        // Additional wait to ensure all translations are fully loaded
        await new Promise(resolve => setTimeout(resolve, 500));
        this.translationsLoaded = true;
      } catch (error) {
        console.warn('Translation loading failed, falling back to default:', error);
        this.translate.use('hu');
        this.translationsLoaded = true;
      }
    } else {
      // Standard loading for development
      this.translate.use(langToUse);
      this.translationsLoaded = true;
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  isLoggedIn(): boolean {
    return this.auth.isAuthenticated();
  }

  onLangChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    localStorage.setItem('lang', value);
    this.translate.use(value);
  }
}