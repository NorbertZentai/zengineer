import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TestService, TestHistory } from '../../../core/services/test.service';

@Component({
  selector: 'app-test-history',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule, TranslateModule],
  templateUrl: './test-history.component.html',
  styleUrls: ['./test-history.component.scss']
})
export class TestHistoryComponent implements OnInit {
  testHistory: TestHistory[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(private testService: TestService) {}

  async ngOnInit() {
    await this.loadTestHistory();
  }

  async loadTestHistory(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      this.testHistory = await this.testService.loadTestHistory();
    } catch (error: any) {
      this.error = error.message || 'Hiba történt a teszt előzmények betöltésekor';
    } finally {
      this.isLoading = false;
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getPerformanceClass(percentage: number): string {
    if (percentage >= 80) return 'excellent';
    if (percentage >= 60) return 'good';
    return 'needs-improvement';
  }

  getPerformanceIcon(percentage: number): string {
    if (percentage >= 80) return 'emoji_events';
    if (percentage >= 60) return 'thumb_up';
    return 'trending_up';
  }

  getAverageScore(): number {
    if (this.testHistory.length === 0) return 0;
    const total = this.testHistory.reduce((sum, test) => sum + test.percentage, 0);
    return Math.round(total / this.testHistory.length);
  }

  getTotalTests(): number {
    return this.testHistory.length;
  }

  getTotalTimeSpent(): number {
    return this.testHistory.reduce((sum, test) => sum + test.time_spent, 0);
  }

  getRecentTests(): TestHistory[] {
    return this.testHistory.slice(0, 5);
  }

  async retryTest(quizId: string): Promise<void> {
    // This would trigger the test configuration modal for the specific quiz
    // Implementation depends on your routing setup
    // ...existing code...
  }
}
