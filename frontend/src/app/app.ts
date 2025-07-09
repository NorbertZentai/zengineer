import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';
import { CommonModule  } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TranslateModule, CommonModule, NavbarComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  protected title = 'zengineer';

  constructor(private translate: TranslateService, private auth: AuthService, private router: Router) {
    translate.addLangs(['en', 'hu']);

    const savedLang = localStorage.getItem('lang');
    const browserLang = translate.getBrowserLang();
    const langToUse = savedLang || (browserLang?.match(/en|hu/) ? browserLang : 'hu');

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