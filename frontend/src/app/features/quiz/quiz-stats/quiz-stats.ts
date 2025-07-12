import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { QuizService, Quiz, StudyStats } from '../../../core/services/quiz.service';

@Component({
  standalone: true,
  selector: 'app-quiz-stats',
  templateUrl: './quiz-stats.html',
  styleUrls: ['./quiz-stats.scss'],
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressBarModule
  ]
})
export class QuizStatsComponent {
  quiz: Quiz;
  stats: StudyStats;

  constructor(
    private dialogRef: MatDialogRef<QuizStatsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { quiz: Quiz },
    private quizService: QuizService
  ) {
    this.quiz = data.quiz;
    this.stats = this.quizService.getStudyStats(this.quiz);
  }

  close(): void {
    this.dialogRef.close();
  }

  getProgressColor(percentage: number): string {
    if (percentage >= 80) return '#4caf50';
    if (percentage >= 60) return '#ff9800';
    return '#f44336';
  }

  getDifficultyDistribution() {
    const distribution = { easy: 0, medium: 0, hard: 0 };
    this.quiz.cards?.forEach((card: any) => {
      distribution[card.difficulty as keyof typeof distribution]++;
    });
    return distribution;
  }

  getTagDistribution() {
    const tagCount: { [key: string]: number } = {};
    this.quiz.cards?.forEach((card: any) => {
      card.tags.forEach((tag: string) => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10); // Top 10 tags
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('hu-HU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}
