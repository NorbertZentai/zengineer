import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class NavbarComponent {
  constructor(
    private auth: AuthService,
    private router: Router,
    public translate: TranslateService
  ) {}

  isLoggedIn(): boolean {
    return this.auth.isAuthenticated;
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  changeLang(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.translate.use(value);
  }
}