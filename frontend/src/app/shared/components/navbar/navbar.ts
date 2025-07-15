import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, MatIconModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class NavbarComponent implements OnInit {
  currentTheme: 'light' | 'dark' = 'light';
  authInitialized = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    public translate: TranslateService
  ) {}

  async ngOnInit() {
    this.currentTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    this.setTheme(this.currentTheme);
    
    // Wait for auth initialization
    await this.auth.waitForInit();
    this.authInitialized = true;
  }

  isLoggedIn(): boolean {
    return this.authInitialized && this.auth.isAuthenticated();
  }

  async logout() {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  changeLang(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    localStorage.setItem('lang', value);
    this.translate.use(value);
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(this.currentTheme);
  }

  setTheme(theme: 'light' | 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }
}