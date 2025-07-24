import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
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
export class DashboardPage {
  constructor(public auth: AuthService) {}
}