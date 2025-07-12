import { Component, Inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { QuizService, Quiz, QuizCard, StudySession } from '../../services/quiz.service';
import { safeArray, safeAccess } from '../../utils/safe-access';

type StudyMode = 'classic' | 'review' | 'hard_cards';

@Component({
  standalone: true,
  selector: 'app-study-mode',
  templateUrl: './study-mode.html',
  styleUrls: ['./study-mode.scss'],
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatCardModule,
    MatChipsModule
  ]
})
export class StudyModeComponent {
  quiz: Quiz;
  studySession: StudySession | null = null;
  
  // Study state
  currentCardIndex = signal(0);
  isFlipped = signal(false);
  studyCards = signal<QuizCard[]>([]);
  correctAnswers = signal(0);
  wrongAnswers = signal(0);
  studyMode = signal<StudyMode>('classic');
  showResult = signal(false);
  startTime = signal(new Date());
  
  // Current card
  currentCard = computed(() => {
    const cards = this.studyCards();
    const index = this.currentCardIndex();
    return cards[index] || null;
  });
  
  // Progress calculation
  progress = computed(() => {
    const cards = this.studyCards();
    const index = this.currentCardIndex();
    return cards.length > 0 ? ((index) / cards.length) * 100 : 0;
  });
  
  // Study statistics
  studyStats = computed(() => {
    const correct = this.correctAnswers();
    const wrong = this.wrongAnswers();
    const total = correct + wrong;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;
    
    return {
      total,
      correct,
      wrong,
      accuracy,
      remaining: this.studyCards().length - this.currentCardIndex()
    };
  });
  
  // Time tracking
  elapsedTime = signal(0);
  private timeInterval?: any;

  constructor(
    private dialogRef: MatDialogRef<StudyModeComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { quiz: Quiz },
    private quizService: QuizService
  ) {
    this.quiz = data.quiz;
    this.initializeStudyMode();
    this.startTimer();
  }

  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  private initializeStudyMode(): void {
    let cards: QuizCard[] = [];
    
    switch (this.studyMode()) {
      case 'classic':
        cards = [...safeArray(this.quiz.cards)];
        break;
      case 'review':
        cards = this.quizService.getCardsNeedingReview(this.quiz);
        break;
      case 'hard_cards':
        cards = safeArray(this.quiz.cards).filter(card => 
          card.difficulty === 'hard' || card.successRate < 0.6
        );
        break;
    }
    
    // Shuffle cards if enabled in settings
    const studySettings = this.quiz.studySettings;
    if (studySettings?.shuffleCards) {
      cards = this.shuffleArray(cards);
    }
    
    this.studyCards.set(cards);
    this.studySession = this.quizService.startStudySession(this.quiz);
  }

  private startTimer(): void {
    this.timeInterval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - this.startTime().getTime()) / 1000);
      this.elapsedTime.set(elapsed);
    }, 1000);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  flipCard(): void {
    this.isFlipped.update(flipped => !flipped);
  }

  async answerCard(isCorrect: boolean): Promise<void> {
    const card = this.currentCard();
    if (!card) return;
    
    // Update statistics
    if (isCorrect) {
      this.correctAnswers.update(count => count + 1);
    } else {
      this.wrongAnswers.update(count => count + 1);
    }
    
    // Update card statistics
    const newReviewCount = card.reviewCount + 1;
    const newSuccessRate = isCorrect 
      ? (card.successRate * card.reviewCount + 1) / newReviewCount
      : (card.successRate * card.reviewCount) / newReviewCount;
    
    const nextReview = this.quizService.calculateNextReview(card, isCorrect);
    
    await this.quizService.updateCard(this.quiz.id!, card.id!, {
      reviewCount: newReviewCount,
      successRate: newSuccessRate,
      lastReviewed: new Date(),
      nextReview
    });
    
    // Update study session
    this.quizService.updateStudySession({
      totalAnswers: this.studyStats().total,
      correctAnswers: this.correctAnswers(),
      cardsReviewed: [...safeArray(this.studySession?.cardsReviewed), card.id!]
    });
    
    // Move to next card or finish
    this.nextCard();
  }

  private nextCard(): void {
    this.isFlipped.set(false);
    
    if (this.currentCardIndex() < this.studyCards().length - 1) {
      this.currentCardIndex.update(index => index + 1);
    } else {
      this.finishStudy();
    }
  }

  private finishStudy(): void {
    this.showResult.set(true);
    
    if (this.studySession) {
      const session = this.quizService.endStudySession(this.studySession);
    }
    
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  restartStudy(): void {
    this.currentCardIndex.set(0);
    this.isFlipped.set(false);
    this.correctAnswers.set(0);
    this.wrongAnswers.set(0);
    this.showResult.set(false);
    this.startTime.set(new Date());
    this.initializeStudyMode();
    this.startTimer();
  }

  changeStudyMode(mode: StudyMode): void {
    this.studyMode.set(mode);
    this.restartStudy();
  }

  skipCard(): void {
    this.nextCard();
  }

  resetCard(): void {
    this.isFlipped.set(false);
  }

  getCardDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'easy': return '#4caf50';
      case 'medium': return '#ff9800';
      case 'hard': return '#f44336';
      default: return '#666';
    }
  }

  getCardDifficultyLabel(difficulty: string): string {
    switch (difficulty) {
      case 'easy': return 'Könnyű';
      case 'medium': return 'Közepes';
      case 'hard': return 'Nehéz';
      default: return difficulty;
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getAccuracyColor(accuracy: number): string {
    if (accuracy >= 80) return '#4caf50';
    if (accuracy >= 60) return '#ff9800';
    return '#f44336';
  }

  close(completed: boolean = false): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
    
    const result = completed ? this.studySession : null;
    this.dialogRef.close(result);
  }

  exitStudy(): void {
    if (confirm('Biztosan ki szeretnél lépni a tanulásból? A haladás nem kerül mentésre.')) {
      this.close(false);
    }
  }
}
