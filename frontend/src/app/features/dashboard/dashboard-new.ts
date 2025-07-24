import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { TestHistoryComponent } from './test-history/test-history.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    TranslateModule, 
    MatIconModule, 
    RouterModule,
    TestHistoryComponent
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardPage implements OnInit {
  loading = true;

  constructor(
    public auth: AuthService,
    private translate: TranslateService
  ) {}

  async ngOnInit() {
    // Simulate loading
    setTimeout(() => {
      this.loading = false;
    }, 500);
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return this.translate.instant('DASHBOARD.GOOD_MORNING');
    if (hour < 18) return this.translate.instant('DASHBOARD.GOOD_AFTERNOON');
    return this.translate.instant('DASHBOARD.GOOD_EVENING');
  }
}
