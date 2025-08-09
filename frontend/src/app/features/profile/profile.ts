import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { TestService } from '../../core/services/test.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

interface UserStats {
  totalTests: number;
  totalQuestions: number;
  averageScore: number;
  bestScore: number;
  totalTimeSpent: number;
  testsByType: {
    [key: string]: number;
  };
  recentTests: any[];
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class ProfilePage implements OnInit {
  private supabase: SupabaseClient;
  user: any = null;
  userStats: UserStats = {
    totalTests: 0,
    totalQuestions: 0,
    averageScore: 0,
    bestScore: 0,
    totalTimeSpent: 0,
    testsByType: {},
    recentTests: []
  };
  loading = true;
  error = '';

  // Make Object available in template
  Object = Object;

  constructor(
    private authService: AuthService,
    private testService: TestService,
  private translate: TranslateService,
  private notificationService: NotificationService
  ) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  async ngOnInit() {
    this.user = this.authService.user();
    if (this.user) {
      await this.loadUserStats();
    }
    this.loading = false;
  }

  async loadUserStats() {
    try {
      // Get user's test history
      const { data: testHistory, error: testError } = await this.supabase
        .from('test_history')
        .select('*')
        .eq('user_id', this.user.id)
        .order('completed_at', { ascending: false });

      if (testError) throw testError;

      if (testHistory && testHistory.length > 0) {
        this.userStats.totalTests = testHistory.length;
        this.userStats.totalQuestions = testHistory.reduce((sum, test) => sum + test.total_questions, 0);
        this.userStats.averageScore = testHistory.reduce((sum, test) => sum + test.percentage, 0) / testHistory.length;
        this.userStats.bestScore = Math.max(...testHistory.map(test => test.percentage));
        this.userStats.totalTimeSpent = testHistory.reduce((sum, test) => sum + test.time_spent, 0);
        
        // Group by test type
        this.userStats.testsByType = testHistory.reduce((acc, test) => {
          acc[test.test_type] = (acc[test.test_type] || 0) + 1;
          return acc;
        }, {});

        // Get recent tests (last 5)
        this.userStats.recentTests = testHistory.slice(0, 5);
  }
  this.notificationService.success('PROFILE.MESSAGES.STATS_LOADED', 'PROFILE.TITLE');
    } catch (error) {
      console.error('Error loading user stats:', error);
      this.error = this.translate.instant('PROFILE.LOAD_ERROR');
  this.notificationService.error('PROFILE.MESSAGES.STATS_LOAD_ERROR', 'PROFILE.TITLE');
    }
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  getScoreColor(score: number): string {
    if (score >= 90) return 'text-green-500';
    if (score >= 75) return 'text-blue-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  }
}
