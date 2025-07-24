import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TestService, TestSession, TestQuestion, TestAnswer, TestResult } from '../../../core/services/test.service';
import { QuizService } from '../../../core/services/quiz.service';

@Component({
  selector: 'app-test-execution',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TranslateModule],
  templateUrl: './test-execution.component.html',
  styleUrls: ['./test-execution.component.scss']
})
export class TestExecutionComponent implements OnInit, OnDestroy {
  session: TestSession | null = null;
  currentQuestion: TestQuestion | null = null;
  userAnswer: string = '';
  selectedAnswers: string[] = [];
  showHint = false;
  isAnswerSubmitted = false;
  isFlipped = false;
  
  // Timer
  remainingTime: number | null = null;
  timeSpent = 0;
  questionStartTime = Date.now();
  timerInterval: any;
  
  // State
  isLoading = false;
  error: string | null = null;
  showResult = false;
  testResult: TestResult | null = null;
  isExiting = false;

  get hasMaxAttemptsReached(): boolean {
    // For now, just return false - can be enhanced later with proper attempt tracking
    return false;
  }

  constructor(
    private testService: TestService,
    private quizService: QuizService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    // Get the current session
    this.session = this.testService.currentSession();
    
    if (!this.session) {
      // No active session, redirect back
      this.router.navigate(['/quiz-manager']);
      return;
    }

    this.loadCurrentQuestion();
    this.startTimer();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  loadCurrentQuestion(): void {
    this.currentQuestion = this.testService.getCurrentQuestion();
    this.resetQuestionState();
    this.questionStartTime = Date.now();
    
    if (this.testService.isTestCompleted()) {
      this.completeTest();
    }
  }

  resetQuestionState(): void {
    this.userAnswer = '';
    this.selectedAnswers = [];
    this.showHint = false;
    this.isAnswerSubmitted = false;
    this.isFlipped = false;
  }

  startTimer(): void {
    this.remainingTime = this.testService.getRemainingTime();
    
    this.timerInterval = setInterval(() => {
      this.timeSpent++;
      this.remainingTime = this.testService.getRemainingTime();
      
      if (this.remainingTime !== null && this.remainingTime <= 0) {
        this.timeUp();
      }
    }, 1000);
  }

  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  timeUp(): void {
    this.stopTimer();
    this.completeTest();
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getProgress(): { current: number; total: number; percentage: number } {
    return this.testService.getProgress();
  }

  toggleHint(): void {
    this.showHint = !this.showHint;
  }

  flipCard(): void {
    if (this.currentQuestion?.type === 'flashcard') {
      this.isFlipped = !this.isFlipped;
    }
  }

  onMultipleChoiceSelect(answer: string): void {
    if (this.isAnswerSubmitted) return;
    
    const index = this.selectedAnswers.indexOf(answer);
    if (index > -1) {
      this.selectedAnswers.splice(index, 1);
    } else {
      this.selectedAnswers.push(answer);
    }
  }

  isAnswerSelected(answer: string): boolean {
    return this.selectedAnswers.includes(answer);
  }

  canSubmitAnswer(): boolean {
    if (!this.currentQuestion) return false;
    
    switch (this.currentQuestion.type) {
      case 'multiple_choice':
        return this.selectedAnswers.length > 0;
      case 'written':
        return this.userAnswer.trim().length > 0;
      case 'flashcard':
        return true; // Flashcards can always be submitted
      default:
        return false;
    }
  }

  async submitAnswer(): Promise<void> {
    if (!this.currentQuestion || !this.canSubmitAnswer()) return;
    
    this.isLoading = true;
    
    try {
      const questionTime = Math.floor((Date.now() - this.questionStartTime) / 1000);
      let answer: string | string[];
      
      switch (this.currentQuestion.type) {
        case 'multiple_choice':
          answer = this.selectedAnswers;
          break;
        case 'written':
          answer = this.userAnswer.trim();
          break;
        case 'flashcard':
          // For flashcards, we'll mark as correct by default and let user self-assess
          answer = 'correct';
          break;
        default:
          answer = '';
      }
      
      await this.testService.answerQuestion(
        this.currentQuestion.id,
        answer,
        questionTime,
        this.showHint
      );
      
      this.isAnswerSubmitted = true;
      
      // For immediate feedback mode or flashcards, show result briefly
      if (this.session?.configuration.immediateResultsForMC || this.currentQuestion.type === 'flashcard') {
        setTimeout(() => this.nextQuestion(), 1500);
      }
      
    } catch (error: any) {
      this.error = error.message || 'Hiba történt a válasz mentésekor';
    } finally {
      this.isLoading = false;
    }
  }

  markFlashcardAnswer(isCorrect: boolean): void {
    if (!this.currentQuestion || this.currentQuestion.type !== 'flashcard') return;
    
    this.submitFlashcardAnswer(isCorrect ? 'correct' : 'incorrect');
  }

  async submitFlashcardAnswer(result: string): Promise<void> {
    if (!this.currentQuestion) return;
    
    this.isLoading = true;
    
    try {
      const questionTime = Math.floor((Date.now() - this.questionStartTime) / 1000);
      
      await this.testService.answerQuestion(
        this.currentQuestion.id,
        result,
        questionTime,
        this.showHint
      );
      
      this.isAnswerSubmitted = true;
      setTimeout(() => this.nextQuestion(), 1000);
      
    } catch (error: any) {
      this.error = error.message || 'Hiba történt a válasz mentésekor';
    } finally {
      this.isLoading = false;
    }
  }

  nextQuestion(): void {
    this.loadCurrentQuestion();
  }

  async completeTest(): Promise<void> {
    this.stopTimer();
    this.isLoading = true;
    
    try {
      // Get quiz name for the result
      const quizId = this.session?.quiz_id;
      let quizName = 'Ismeretlen kvíz';
      
      if (quizId) {
        const quiz = this.quizService.quizzes().find(q => q.id === quizId);
        quizName = quiz?.name || quizName;
      }
      
      const result = await this.testService.completeTest();
      result.quiz_name = quizName;
      
      this.testResult = result;
      this.showResult = true;
      
    } catch (error: any) {
      this.error = error.message || 'Hiba történt a teszt befejezésekor';
    } finally {
      this.isLoading = false;
    }
  }

  async retryTest(): Promise<void> {
    if (!this.session?.configuration?.allowRetry) return;
    
    // Create new session with same configuration
    this.router.navigate(['/quiz-manager', this.session.quiz_id]);
  }

  async restartTest(): Promise<void> {
    await this.retryTest();
  }

  exitTest(): void {
    this.isExiting = true;
    this.stopTimer();
    this.router.navigate(['/quiz-manager', this.session?.quiz_id || '']);
  }

  getAnswerClass(answer: string): string {
    if (!this.isAnswerSubmitted || !this.currentQuestion) return '';
    
    if (this.currentQuestion.type === 'multiple_choice') {
      const isCorrect = this.currentQuestion.correct_answers?.includes(answer);
      const isSelected = this.selectedAnswers.includes(answer);
      
      if (isSelected && isCorrect) return 'correct-selected';
      if (isSelected && !isCorrect) return 'incorrect-selected';
      if (!isSelected && isCorrect) return 'correct-unselected';
    }
    
    return '';
  }

  pauseTest(): void {
    this.testService.pauseTest();
    this.stopTimer();
  }

  resumeTest(): void {
    this.testService.resumeTest();
    this.startTimer();
  }

  isPaused(): boolean {
    return this.session?.status === 'paused';
  }
}
