import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';
import { CommonModule  } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar';
import { ToastNotification } from './components/toast-notification/toast-notification';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TranslateModule, CommonModule, NavbarComponent, ToastNotification],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  protected title = 'zengineer';

  constructor(private translate: TranslateService, private auth: AuthService, private router: Router) {
    // Initialize languages
    translate.addLangs(['en', 'hu']);
    translate.setDefaultLang('hu');

    // Determine language to use
    const savedLang = localStorage.getItem('lang');
    const browserLang = translate.getBrowserLang();
    const langToUse = savedLang || (browserLang?.match(/en|hu/) ? browserLang : 'hu');

    // Set the language
    translate.use(langToUse);
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  isLoggedIn(): boolean {
    return this.auth.isAuthenticated;
  }

  onLangChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    localStorage.setItem('lang', value);
    this.translate.use(value);
  }
}