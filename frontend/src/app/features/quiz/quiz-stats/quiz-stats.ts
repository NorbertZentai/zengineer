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
  // Sample quiz data - replace with actual quiz input
  quiz: Quiz = {
    id: '1',
    name: 'Sample Quiz',
    description: 'A sample quiz for demonstration',
    cards: [],
    tags: [],
    color: '#667eea',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    folder_id: '',
    project_id: '',
    visibility: 'private',
    difficulty_level: 2,
    estimated_time: 30,
    study_modes: ['flashcard'],
    language: 'en'
  };
  
  stats: StudyStats;

  constructor(
    private quizService: QuizService
  ) {
    this.stats = this.quizService.getStudyStats(this.quiz);
  }

  close(): void {
    console.log('TODO: Close stats dialog');
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

  // Helper method to extract tags from quiz cards
  getQuizTags(quiz: Quiz): string[] {
    const allTags = new Set<string>();
    quiz.cards?.forEach(card => {
      card.tags?.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags);
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

  formatDateString(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    return this.formatDate(new Date(dateString));
  }
}
