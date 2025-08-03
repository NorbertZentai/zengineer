// ...existing code...
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
  getQuestionById(id: string): TestQuestion | undefined {
    return this.session?.questions?.find(q => q.id === id);
  }
  // Helper to parse correct answers from question.answer JSON
  getParsedCorrectAnswers(question?: TestQuestion): string[] {
    if (!question || !question.answer) return [];
    try {
      const parsed = JSON.parse(question.answer);
      return Array.isArray(parsed.correct) ? parsed.correct : [];
    } catch {
      return [];
    }
  }
  showScrollTop = false;
  private scrollListener: (() => void) | null = null;

  ngOnDestroy() {
    this.stopTimer();
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener as EventListener);
    }
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  // Segédfüggvények a részletes eredmény kimutatáshoz
  isOptionCorrect(opt: string, question: TestQuestion | undefined): boolean {
    if (!question) return false;
    if (question.type === 'multi_select' && question.answer) {
      try {
        const parsed = JSON.parse(question.answer);
        return Array.isArray(parsed.correct) && parsed.correct.includes(opt);
      } catch {
        return false;
      }
    }
    if ((question.type === 'multiple_choice' || question.type === 'flashcard') && typeof question.correct_answer === 'string') {
      return question.correct_answer === opt;
    }
    return false;
  }

  isOptionSelected(opt: string, answer: TestAnswer): boolean {
    if (Array.isArray(answer.answer)) {
      return answer.answer.includes(opt);
    }
    return answer.answer === opt;
  }
  onMultiSelectToggle(answer: string): void {
    if (this.isAnswerSubmitted) return;
    const index = this.selectedAnswers.indexOf(answer);
    if (index > -1) {
      this.selectedAnswers.splice(index, 1);
    } else {
      this.selectedAnswers.push(answer);
    }
  }

  // Timer
  remainingTime: number | null = null;
  timeSpent = 0;
  questionStartTime = Date.now();
  timerInterval: any;

  isLimitedTime(): boolean {
    return this.remainingTime !== null && this.remainingTime !== Infinity && Number.isFinite(this.remainingTime);
  }
  session: TestSession | null = null;
  formatAnswerForDisplay(answer: any): string {
    if (answer === undefined || answer === null || (typeof answer === 'string' && answer.trim() === '')) {
      return 'Nincs válasz';
    }
    if (typeof answer === 'string') {
      try {
        if (answer.trim().startsWith('{') || answer.trim().startsWith('[')) {
          const parsed = JSON.parse(answer);
          if (typeof parsed === 'object' && parsed.correct) {
            if (Array.isArray(parsed.correct)) {
              return parsed.correct.join(', ');
            }
            return String(parsed.correct);
          }
          if (Array.isArray(parsed)) {
            return parsed.join(', ');
          }
          const answerFields = ['answer', 'text', 'value', 'correct', 'solution'];
          for (const field of answerFields) {
            if (parsed[field]) {
              if (Array.isArray(parsed[field])) {
                return parsed[field].join(', ');
              }
              return String(parsed[field]);
            }
          }
          const entries = Object.entries(parsed)
            .filter(([key, value]) => typeof value === 'string' || typeof value === 'number')
            .map(([key, value]) => `${key}: ${value}`);
          if (entries.length > 0) {
            return entries.join('\n');
          }
          return JSON.stringify(parsed, null, 2);
        }
        return answer;
      } catch (e) {
        return answer;
      }
    }
    if (Array.isArray(answer)) {
      return answer.length > 0 ? answer.join(', ') : 'Nincs válasz';
    }
    return String(answer || 'Nincs válasz');
  }
  currentQuestion: TestQuestion | null = null;
  userAnswer: string = '';
  selectedAnswers: string[] = [];
  showHint = false;
  showSolution = false;
  isAnswerSubmitted = false;
  isFlipped = false;
  
  // ...existing code...
  
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
    // Scroll event for scroll-to-top button
    this.scrollListener = () => {
      this.showScrollTop = window.scrollY > 400;
    };
    window.addEventListener('scroll', this.scrollListener);
  }


  loadCurrentQuestion(): void {
    // Always reload the session to get the latest answers
    if (this.testService.isTestCompleted()) {
      // If test is completed, do not reload session or question
      return;
    }
    this.session = this.testService.currentSession();
    this.currentQuestion = this.testService.getCurrentQuestion();
    // DEBUG: Log test configuration and current question
    const session = this.session;
    if (session) {
      const selectedTypes = session.configuration.testTypes.filter(t => t.enabled).map(t => t.id);
      console.debug('[DEBUG] Teszt indítva:', selectedTypes.length === 1 ? selectedTypes[0] : selectedTypes);
    }
    if (this.currentQuestion) {
      console.debug('[DEBUG] Folyamatban lévő teszt:', this.currentQuestion.type);
      console.debug('[DEBUG] Kérdés:', this.currentQuestion.question);
      if (this.currentQuestion.options) {
        console.debug('[DEBUG] Válaszlehetőségek:', this.currentQuestion.options);
      }
    }
    this.resetQuestionState();
    this.questionStartTime = Date.now();
  }

  resetQuestionState(): void {
    this.userAnswer = '';
    this.selectedAnswers = [];
    this.showHint = false;
    this.showSolution = false;
    this.isAnswerSubmitted = false;
    this.isFlipped = false;
  }

  startTimer(): void {
    this.remainingTime = this.testService.getRemainingTime();
    this.timerInterval = setInterval(() => {
      this.timeSpent++;
      this.remainingTime = this.testService.getRemainingTime();
      // Only auto-complete if time limit is set and reached
      if (this.remainingTime !== null && this.remainingTime !== Infinity && this.remainingTime <= 0) {
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

  toggleSolution(): void {
    this.showSolution = !this.showSolution;
    // Ha megmutatjuk a megoldást, az számít segítség használatnak
    if (this.showSolution) {
      // A segítség használatát már a submitAnswer-ben fogjuk követni
    }
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
      // Clear previous selection (single choice) and select new answer
      this.selectedAnswers = [answer];
      
      // Automatically submit the answer after a short delay
      setTimeout(() => {
        if (!this.isAnswerSubmitted) {
          this.submitAnswer();
        }
      }, 300);
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
      case 'multi_select':
        return this.selectedAnswers.length > 0;
      case 'written':
        return this.userAnswer.trim().length > 0;
      case 'flashcard':
        return true; // Flashcards can always be submitted
      default:
        return false;
    }
  }

  handleImmediateMultipleChoice(answer: string): void {
    if (this.isAnswerSubmitted) return;
    this.selectedAnswers = [answer];
    this.submitAnswer();
    setTimeout(() => {
      if (!this.testService.isTestCompleted()) {
        this.nextQuestion();
      }
    }, 400);
  }

  async submitAnswer(): Promise<void> {
    if (!this.currentQuestion || !this.canSubmitAnswer()) return;
    this.isLoading = true;
    try {
      const questionTime = Math.floor((Date.now() - this.questionStartTime) / 1000);
      let answer: string | string[];
      switch (this.currentQuestion.type) {
        case 'multiple_choice':
        case 'multi_select':
          answer = this.selectedAnswers;
          break;
        case 'written':
          answer = this.userAnswer.trim();
          break;
        case 'flashcard':
          answer = 'correct';
          break;
        default:
          answer = '';
      }
      await this.testService.answerQuestion(
        this.currentQuestion.id,
        answer,
        questionTime,
        this.showHint || this.showSolution
      );
      this.isAnswerSubmitted = true;
      if (this.session?.configuration.immediateResultsForMC && this.currentQuestion.type === 'multiple_choice') {
        setTimeout(() => {
          if (!this.testService.isTestCompleted()) {
            this.nextQuestion();
          }
        }, 1500);
      } else if (this.currentQuestion.type === 'flashcard') {
        setTimeout(() => {
          if (!this.testService.isTestCompleted()) {
            this.nextQuestion();
          }
        }, 1500);
      }
    } catch (error: any) {
      this.error = error.message || 'Hiba történt a válasz mentésekor';
    } finally {
      this.isLoading = false;
    }
  }

  markFlashcardAnswer(isCorrect: boolean): void {
    if (!this.currentQuestion || this.currentQuestion.type !== 'flashcard') return;
    // Submit the answer, load the next question, then flip the card
    this.submitFlashcardAnswer(isCorrect ? 'correct' : 'incorrect').then(() => {
      this.nextQuestion();
      // Flip the card immediately after loading the new question
      this.isFlipped = false;
    });
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
      setTimeout(async () => {
        if (this.testService.isTestCompleted()) {
          await this.completeTest();
        } else {
          this.nextQuestion();
        }
      }, 1000);

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
      // ...existing code...
      
      // Get quiz name for the result
      const quizId = this.session?.quiz_id;
      let quizName = 'Ismeretlen kvíz';
      
      if (quizId) {
        const quiz = this.quizService.quizzes().find(q => q.id === quizId);
        quizName = quiz?.name || quizName;
        // ...existing code...
      }
      
      // ...existing code...
      const result = await this.testService.completeTest();
      result.quiz_name = quizName;
      // Log only the final result JSON to the console
      console.log('Végső eredmény JSON:', JSON.stringify(result, null, 2));
      // Debug: Print session.questions and testResult.answers for ID comparison
      console.log('session.questions:', this.session?.questions);
      console.log('testResult.answers:', result.answers);
      // ...existing code...
      this.testResult = result;
      this.showResult = true;
      
    } catch (error: any) {
      console.error('❌ Test completion failed:', error);
      
      // Create detailed error message
      let detailedError = 'Hiba történt a teszt befejezésekor:\n\n';
      
      if (error.message) {
        detailedError += `Üzenet: ${error.message}\n`;
      }
      
      if (error.code) {
        detailedError += `Hibakód: ${error.code}\n`;
      }
      
      if (error.details) {
        detailedError += `Részletek: ${error.details}\n`;
      }
      
      if (error.hint) {
        detailedError += `Javaslat: ${error.hint}\n`;
      }
      
      // Database specific errors
      if (error.message?.includes('column')) {
        detailedError += '\n🔧 Ez egy adatbázis oszlop hiba. Futtasd le a database fix scriptet a Supabase-ben.';
      }
      
      if (error.message?.includes('test_results')) {
        detailedError += '\n📋 A test_results táblával van probléma.';
      }
      
      if (error.message?.includes('test_configuration')) {
        detailedError += '\n⚙️ A test_configuration oszlop hiányzik vagy rossz nevű.';
      }
      
      if (error.message?.includes('wrong_answers')) {
        detailedError += '\n🎯 A wrong_answers oszlop hiányzik vagy rossz nevű.';
      }
      
      // Add full error object for debugging
      detailedError += `\n\n🔍 Teljes hiba objektum:\n${JSON.stringify(error, null, 2)}`;
      
      this.error = detailedError;
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
    // Only show answer classes if immediate results is enabled and answer is submitted
    if (!this.isAnswerSubmitted || !this.currentQuestion || !this.session?.configuration?.immediateResultsForMC) return '';
    
    if (this.currentQuestion.type === 'multiple_choice') {
      const isCorrect = this.currentQuestion.correct_answer === answer;
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
