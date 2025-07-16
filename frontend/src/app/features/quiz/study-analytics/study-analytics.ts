import { Component, Inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { QuizService, Quiz, QuizCard, StudySession } from '../../../core/services/quiz.service';

interface CardAnalytics {
  card: QuizCard;
  totalReviews: number;
  correctAnswers: number;
  wrongAnswers: number;
  averageResponseTime: number;
  difficultyTrend: 'improving' | 'stable' | 'declining';
  lastReviewed: Date | null;
  needsAttention: boolean;
}

interface StudyAnalytics {
  totalSessions: number;
  totalTimeSpent: number; // in minutes
  averageSessionLength: number;
  totalCards: number;
  masteredCards: number;
  strugglingCards: number;
  overallProgress: number;
  weeklyProgress: { week: string; score: number }[];
  difficultyDistribution: { easy: number; medium: number; hard: number };
  cardAnalytics: CardAnalytics[];
}

@Component({
  standalone: true,
  selector: 'app-study-analytics',
  templateUrl: './study-analytics.html',
  styleUrls: ['./study-analytics.scss'],
  imports: [
    CommonModule
  ]
})
export class StudyAnalyticsComponent implements OnInit {
  analytics = signal<StudyAnalytics | null>(null);
  isLoading = signal(true);

  // Computed properties for easier template access
  strugglingCards = computed(() => 
    this.analytics()?.cardAnalytics.filter(c => c.needsAttention) || []
  );

  masteredCards = computed(() => 
    this.analytics()?.cardAnalytics.filter(c => c.card.successRate >= 0.8) || []
  );

  recentActivity = computed(() => {
    const analytics = this.analytics();
    if (!analytics) return [];
    
    return analytics.cardAnalytics
      .filter(c => c.lastReviewed)
      .sort((a, b) => (b.lastReviewed?.getTime() || 0) - (a.lastReviewed?.getTime() || 0))
      .slice(0, 10);
  });

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

  constructor(
    private quizService: QuizService
  ) {}

  async ngOnInit() {
    await this.loadAnalytics();
  }

  private async loadAnalytics() {
    try {
      this.isLoading.set(true);
      
      // Get study sessions and calculate analytics
      const sessions = await this.quizService.getQuizStats(this.quiz.id!);
      const cards = this.quiz.cards || [];
      
      const analytics: StudyAnalytics = {
        totalSessions: sessions.length,
        totalTimeSpent: sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60,
        averageSessionLength: sessions.length > 0 
          ? sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / sessions.length / 60 
          : 0,
        totalCards: cards.length,
        masteredCards: cards.filter(c => c.successRate >= 0.8).length,
        strugglingCards: cards.filter(c => c.successRate < 0.5 && c.reviewCount > 3).length,
        overallProgress: cards.length > 0 
          ? cards.reduce((sum, c) => sum + c.successRate, 0) / cards.length * 100 
          : 0,
        weeklyProgress: this.calculateWeeklyProgress(sessions),
        difficultyDistribution: this.calculateDifficultyDistribution(cards),
        cardAnalytics: this.calculateCardAnalytics(cards, sessions)
      };
      
      this.analytics.set(analytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private calculateWeeklyProgress(sessions: any[]): { week: string; score: number }[] {
    const weeklyData: Map<string, { total: number; correct: number }> = new Map();
    
    sessions.forEach(session => {
      const date = new Date(session.completed_at);
      const weekKey = this.getWeekKey(date);
      
      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, { total: 0, correct: 0 });
      }
      
      const data = weeklyData.get(weekKey)!;
      data.total += session.total_questions;
      data.correct += session.score;
    });
    
    return Array.from(weeklyData.entries())
      .map(([week, data]) => ({
        week,
        score: data.total > 0 ? (data.correct / data.total) * 100 : 0
      }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-8); // Last 8 weeks
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private calculateDifficultyDistribution(cards: QuizCard[]): { easy: number; medium: number; hard: number } {
    const distribution = { easy: 0, medium: 0, hard: 0 };
    cards.forEach(card => {
      distribution[card.difficulty]++;
    });
    return distribution;
  }

  private calculateCardAnalytics(cards: QuizCard[], sessions: any[]): CardAnalytics[] {
    return cards.map(card => {
      const cardSessions = sessions.filter(s => 
        s.cardsReviewed && s.cardsReviewed.includes(card.id)
      );
      
      const totalReviews = card.reviewCount || 0;
      const correctAnswers = Math.round(totalReviews * card.successRate);
      const wrongAnswers = totalReviews - correctAnswers;
      
      // Calculate trend based on recent performance
      const difficultyTrend = this.calculateDifficultyTrend(card, cardSessions);
      
      return {
        card,
        totalReviews,
        correctAnswers,
        wrongAnswers,
        averageResponseTime: 0, // Would need response time tracking
        difficultyTrend,
        lastReviewed: card.lastReviewed || null,
        needsAttention: card.successRate < 0.5 && totalReviews > 3
      };
    });
  }

  private calculateDifficultyTrend(card: QuizCard, sessions: any[]): 'improving' | 'stable' | 'declining' {
    if (sessions.length < 3) return 'stable';
    
    const recentSessions = sessions.slice(-3);
    const scores = recentSessions.map(s => s.score / s.total_questions);
    
    if (scores.every((score, i) => i === 0 || score >= scores[i - 1])) {
      return 'improving';
    } else if (scores.every((score, i) => i === 0 || score <= scores[i - 1])) {
      return 'declining';
    }
    return 'stable';
  }

  getTrendIcon(trend: string): string {
    switch (trend) {
      case 'improving': return 'trending_up';
      case 'declining': return 'trending_down';
      default: return 'trending_flat';
    }
  }

  getTrendColor(trend: string): string {
    switch (trend) {
      case 'improving': return '#4caf50';
      case 'declining': return '#f44336';
      default: return '#ff9800';
    }
  }

  getProgressColor(percentage: number): string {
    if (percentage >= 80) return '#4caf50';
    if (percentage >= 60) return '#ff9800';
    return '#f44336';
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${Math.round(minutes)} perc`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}ó ${remainingMinutes}p`;
  }

  formatDate(date: Date | null): string {
    if (!date) return 'Soha';
    return date.toLocaleDateString('hu-HU', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  close(): void {
    console.log('TODO: Close analytics dialog');
  }
}
