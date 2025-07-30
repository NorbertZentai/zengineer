// ...existing code...
import { Injectable, signal } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { environment } from '../../../environments/environment';
import { Quiz, QuizCard } from './quiz.service';
import { AuthService } from './auth.service';

export interface TestConfiguration {
  testTypes: TestType[];
  timeLimit?: number; // in minutes
  questionCount?: number; // number of questions to include
  shuffleQuestions: boolean;
  showHints: boolean;
  immediateResultsForMC: boolean;
  allowRetry: boolean;
  maxRetries?: number;
  answerMode?: 'all' | 'own_answers'; // New property for answer mode
}

export interface TestType {
  id: 'flashcard' | 'multiple_choice' | 'multi_select' | 'written';
  name: string;
  description: string;
  enabled: boolean;
}

export interface TestSession {
  id?: string;
  quiz_id: string;
  user_id: string;
  configuration: TestConfiguration;
  questions: TestQuestion[];
  current_question_index: number;
  start_time: string;
  end_time?: string;
  status: 'active' | 'completed' | 'paused' | 'timeout';
  answers: TestAnswer[];
  score?: number;
  total_questions: number;
  correct_answers: number;
  created_at?: string;
  updated_at?: string;
}

export interface TestQuestion {
  id: string;
  card_id: string;
  question: string;
  type: 'multiple_choice' | 'multi_select' | 'flashcard' | 'written'; // <-- javítva!
  hint?: string;
  difficulty?: number;
  order?: number;
  options?: string[];
  correct_answer?: string;
  correct_answers?: string[];
}

export interface TestAnswer {
  question_id: string;
  answer: string | string[];
  is_correct: boolean;
  time_spent: number; // in seconds
  attempts: number;
  hint_used: boolean;
  answered_at: string;
}

export interface TestResult {
  id?: string;
  session_id: string;
  quiz_id: string;
  user_id: string;
  quiz_name: string;
  score: number;
  percentage: number;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  time_spent: number; // in seconds
  test_configuration: TestConfiguration;
  answers: TestAnswer[];
  completed_at: string;
  created_at?: string;
}

export interface TestHistory {
  id?: string;
  user_id: string;
  quiz_id: string;
  quiz_name: string;
  score: number;
  percentage: number;
  total_questions: number;
  correct_answers: number;
  time_spent: number;
  test_type: string;
  completed_at: string;
  created_at?: string;
}

export interface CardPerformance {
  id?: string;
  user_id: string;
  quiz_id: string;
  card_id: string;
  correct_count: number;
  incorrect_count: number;
  total_attempts: number;
  average_response_time: number;
  hints_used_count: number;
  last_answered_at: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TestService {
  private supabase: SupabaseClient;
  
  // Reactive state
  currentSession = signal<TestSession | null>(null);
  testHistory = signal<TestHistory[]>([]);
  isLoading = signal(false);

  // Default test types
  readonly DEFAULT_TEST_TYPES: TestType[] = [
    {
      id: 'flashcard',
      name: 'Kártya teszt',
      description: 'Hagyományos kártya alapú teszt fordítással',
      enabled: true
    },
    {
      id: 'multiple_choice',
      name: 'Feleletválasztós',
      description: 'Többválasztásos kérdések',
      enabled: false
    },
    {
      id: 'written',
      name: 'Írásos válasz',
      description: 'Szöveges válaszok begépelése',
      enabled: false
    },
    {
      id: 'multi_select',
      name: 'Többszörös válasz',
      description: 'Több helyes válasz kiválasztása több lehetőség közül',
      enabled: false
    },
  ];

  constructor(private authService: AuthService) {
    this.supabase = SupabaseService.getClient();
  }

  // --- Missing methods for test-execution.component.ts ---
  getCurrentQuestion(): TestQuestion | null {
    const session = this.currentSession();
    if (!session) return null;
    return session.questions[session.current_question_index] || null;
  }

  isTestCompleted(): boolean {
    const session = this.currentSession();
    return session ? session.status === 'completed' : false;
  }

  getRemainingTime(): number {
    const session = this.currentSession();
    if (!session) return 0;
    if (!session.configuration.timeLimit || session.configuration.timeLimit <= 0) {
      // No time limit set, unlimited time
      return Infinity;
    }
    const start = new Date(session.start_time).getTime();
    const now = Date.now();
    const elapsed = (now - start) / 1000 / 60; // percben
    const remaining = session.configuration.timeLimit - elapsed;
    return Math.max(0, Math.floor(remaining));
  }

  getProgress(): { current: number; total: number; percentage: number } {
    const session = this.currentSession();
    if (!session) return { current: 0, total: 0, percentage: 0 };
    const current = session.current_question_index + 1;
    const total = session.total_questions;
    const percentage = total > 0 ? (current / total) * 100 : 0;
    return { current, total, percentage };
  }

  pauseTest(): void {
    const session = this.currentSession();
    if (session) {
      session.status = 'paused';
      this.currentSession.set({ ...session });
    }
  }

  resumeTest(): void {
    const session = this.currentSession();
    if (session && session.status === 'paused') {
      session.status = 'active';
      this.currentSession.set({ ...session });
    }
  }

  async createTestSession(quizId: string, config: TestConfiguration): Promise<TestSession> {
    const user = this.authService.currentUser;
    if (!user) {
      throw new Error('Nincs bejelentkezett felhasználó');
    }

    this.isLoading.set(true);
    
    try {
      // Get quiz cards
      const { data: cards, error: cardsError } = await this.supabase
        .from('quiz_cards')
        .select('*')
        .eq('quiz_id', quizId);

      if (cardsError) {
        throw new Error(`Kártyák lekérdezési hiba: ${cardsError.message}`);
      }
      
      if (!cards || cards.length === 0) {
        throw new Error('A kvízhez nincsenek kártyák');
      }

      // Convert cards to test questions
      const questions = this.generateTestQuestions(cards, config);

      const session: TestSession = {
        quiz_id: quizId,
        user_id: user.id,
        configuration: config,
        questions: questions,
        current_question_index: 0,
        start_time: new Date().toISOString(),
        status: 'active',
        answers: [],
        total_questions: questions.length,
        correct_answers: 0
      };

      // Save session to database
      const { data, error } = await this.supabase
        .from('test_sessions')
        .insert(session)
        .select()
        .single();

      if (error) {
        throw new Error(`Adatbázis hiba: ${error.message}${error.details ? ` (${error.details})` : ''}${error.hint ? ` Tipp: ${error.hint}` : ''}`);
      }

      const savedSession = { ...session, id: data.id };
      this.currentSession.set(savedSession);
      
      return savedSession;
    } catch (error: any) {
      // Re-throw with more context
      if (error.message?.includes('Adatbázis hiba:')) {
        throw error; // Already formatted
      } else {
        throw new Error(`TestService hiba: ${error.message || 'Ismeretlen hiba'}`);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  private generateTestQuestions(cards: QuizCard[], config: TestConfiguration): TestQuestion[] {
    const enabledTypes = config.testTypes.filter(t => t.enabled).map(t => t.id);
    let selectedCards = cards.filter(card => {
      let answerObj: any = {};
      try {
        answerObj = JSON.parse(card.answer ?? '');
      } catch {
        answerObj = {};
      }
      // Relaxed filtering: allow any card with at least one correct answer
      return Array.isArray(answerObj.correct) && answerObj.correct.length >= 1;
    });
    if (config.questionCount && config.questionCount > 0 && config.questionCount < selectedCards.length) {
      if (config.shuffleQuestions) {
        selectedCards = this.shuffleArray(selectedCards);
      }
      selectedCards = selectedCards.slice(0, config.questionCount);
    }
    const questions: TestQuestion[] = [];
    for (let index = 0; index < selectedCards.length; index++) {
      const card = selectedCards[index];
      let answerObj: any = {};
      try {
        answerObj = JSON.parse(card.answer ?? '');
      } catch {
        answerObj = {};
      }
      let detectedType = answerObj.type;
      const enabledTypesForType = config.testTypes.filter(t => t.enabled);
      if (enabledTypesForType.length === 1) {
        detectedType = enabledTypesForType[0].id;
      } else {
        if (
          Array.isArray(answerObj.correct) && answerObj.correct.length >= 2 &&
          Array.isArray(answerObj.incorrect) && answerObj.incorrect.length >= 3
        ) {
          detectedType = 'multi_select';
        } else if (
          Array.isArray(answerObj.correct) && answerObj.correct.length === 1 &&
          Array.isArray(answerObj.incorrect) && answerObj.incorrect.length >= 1
        ) {
          detectedType = 'multiple_choice';
        }
      }
      const question: any = {
        id: `${card.id}-${index}`,
        card_id: card.id!,
        question: card.question,
        type: detectedType,
        hint: config.showHints ? card.hint : undefined,
        order: index
      };
      // Always set options for multiple_choice and multi_select
      if (Array.isArray(answerObj.correct) && Array.isArray(answerObj.incorrect)) {
        if (question.type === 'multiple_choice') {
          const correctAnswer = String(this.shuffleArray(answerObj.correct)[0] ?? '');
          const incorrectOptions = this.shuffleArray(
            answerObj.incorrect.filter((opt: any) => typeof opt === 'string' && opt.trim().toLowerCase() !== correctAnswer.trim().toLowerCase())
          ).slice(0, 3);
          if (incorrectOptions.length < 3) continue;
          const allOptions = [correctAnswer, ...incorrectOptions];
          question.options = this.shuffleArray(allOptions);
          question.correct_answer = correctAnswer;
        } else if (question.type === 'multi_select') {
          if (answerObj.correct.length < 2 || answerObj.incorrect.length < 3) continue;
          const allOptions = [...answerObj.correct, ...answerObj.incorrect];
          question.options = this.shuffleArray(allOptions);
          question.correct_answers = answerObj.correct;
        }
      }
      if (question.type === 'written' || question.type === 'flashcard') {
        question.correct_answer = Array.isArray(answerObj.correct) ? answerObj.correct[0] : answerObj.correct;
      }
      questions.push(question);
    }
    console.debug('Generated questions:', questions);
    return config.shuffleQuestions ? this.shuffleArray(questions) : questions;
  }

  private shuffleArray<T>(array: T[]): T[] {
    // Klasszikus Fisher-Yates shuffle
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  private formatAnswer(answer: any): string {
    if (typeof answer === 'string') {
      try {
        if (answer.trim().startsWith('{') || answer.trim().startsWith('[')) {
          const parsed = JSON.parse(answer);
          if (typeof parsed === 'object' && parsed.correct) {
            return parsed.correct;
          }
          if (Array.isArray(parsed)) {
            return parsed.join(', ');
          }
          if (typeof parsed === 'object') {
            const answerFields = ['answer', 'text', 'value', 'correct', 'solution'];
            for (const field of answerFields) {
              if (parsed[field]) {
                return parsed[field];
              }
            }
            const firstStringValue = Object.values(parsed).find(val => typeof val === 'string');
            if (firstStringValue) {
              return firstStringValue as string;
            }
          }
          return JSON.stringify(parsed);
        }
        return answer;
      } catch (e) {
        return answer;
      }
    }
    return String(answer || '');
  }

  private generateIncorrectOptions(allCards: any[], currentCard: any, count: number): string[] {
    // Get answers from other cards as incorrect options
    const currentFormattedAnswer = this.formatAnswer(currentCard.answer);
    const otherAnswers = allCards
      .filter(card => card.id !== currentCard.id && card.answer)
      .map(card => this.formatAnswer(card.answer))
      .filter(answer => answer && answer !== currentFormattedAnswer);
    
    // If we don't have enough other answers, generate some generic options
    if (otherAnswers.length < count) {
      const genericOptions = [
        'Nem tudom',
        'Egyéb válasz',
        'Nincs helyes válasz',
        'A fenti egyik sem'
      ];
      
      // Add generic options that aren't already in the list
      const uniqueGeneric = genericOptions.filter(opt => 
        !otherAnswers.includes(opt) && opt !== currentFormattedAnswer
      );
      
      otherAnswers.push(...uniqueGeneric);
    }
    
    // Shuffle and take the requested count
    const shuffled = this.shuffleArray(otherAnswers);
    return shuffled.slice(0, count);
  }

  async answerQuestion(questionId: string, answer: string | string[], timeSpent: number, hintUsed: boolean = false): Promise<void> {
    const session = this.currentSession();
    if (!session) throw new Error('Nincs aktív teszt session');
    const question = session.questions.find(q => q.id === questionId);
    if (!question) throw new Error('Kérdés nem található');
    let isCorrect = false;
    if (question.type === 'multiple_choice' || question.type === 'written' || question.type === 'flashcard') {
      if (typeof answer === 'string' && question.correct_answer) {
        isCorrect = answer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
      }
    } else if (question.type === 'multi_select') {
      if (Array.isArray(answer) && Array.isArray(question.correct_answers)) {
        const sortedUser = [...answer].map(a => a.trim().toLowerCase()).sort();
        const sortedCorrect = [...question.correct_answers].map(a => a.trim().toLowerCase()).sort();
        isCorrect = JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect);
      }
    }
    console.debug('Answer checked:', { questionId, answer, isCorrect });
    const testAnswer: TestAnswer = {
      question_id: questionId,
      answer,
      is_correct: isCorrect,
      time_spent: timeSpent,
      attempts: 1,
      hint_used: hintUsed,
      answered_at: new Date().toISOString()
    };
    const updatedAnswers = [...session.answers, testAnswer];
    const correctAnswers = updatedAnswers.filter(a => a.is_correct).length;
    const updatedSession = {
      ...session,
      answers: updatedAnswers,
      correct_answers: correctAnswers
    };
    this.currentSession.set(updatedSession);
    await this.updateSession(updatedSession);
  }

  async completeTest(): Promise<TestResult> {
    try {
      const session = this.currentSession();
      if (!session) {
        throw new Error('Nincs aktív teszt session');
      }

      const endTime = new Date().toISOString();
      const timeSpent = Math.floor((new Date(endTime).getTime() - new Date(session.start_time).getTime()) / 1000);
      
      const result: TestResult = {
        session_id: session.id!,
        quiz_id: session.quiz_id,
        user_id: session.user_id,
        quiz_name: '', // Will be filled by caller
        score: session.correct_answers,
        percentage: Math.round((session.correct_answers / session.total_questions) * 100),
        total_questions: session.total_questions,
        correct_answers: session.correct_answers,
        wrong_answers: session.total_questions - session.correct_answers,
        time_spent: timeSpent,
        test_configuration: session.configuration,
        answers: session.answers,
        completed_at: endTime
      };
      
      // Update session status
      const completedSession = {
        ...session,
        status: 'completed' as const,
        end_time: endTime
      };

      await this.updateSession(completedSession);

      // Save result to history
      await this.saveTestResult(result);

      this.currentSession.set(null);
      
      return result;
    } catch (error) {
      console.error('❌ completeTest failed:', error);
      throw error;
    }
  }

  private async updateSession(session: TestSession): Promise<void> {
    if (!session.id) return;

    try {
      const { error } = await this.supabase
        .from('test_sessions')
        .update(session)
        .eq('id', session.id);

      if (error) {
        console.error('❌ Error updating session:', error);
        throw new Error(`Adatbázis hiba test_sessions táblában: ${error.message} (Kód: ${error.code})`);
      }
    } catch (error) {
      console.error('❌ updateSession failed:', error);
      throw error;
    }
  }

  private async saveTestResult(result: TestResult): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('test_results')
        .insert(result);

      if (error) {
        console.error('❌ Error saving to test_results:', error);
        throw new Error(`Adatbázis hiba test_results táblában: ${error.message} (Kód: ${error.code})`);
      }
      
      // Add to test history
      const historyItem: TestHistory = {
        user_id: result.user_id,
        quiz_id: result.quiz_id,
        quiz_name: result.quiz_name,
        score: result.score,
        percentage: (typeof result.percentage === 'number' && !isNaN(result.percentage)) ? result.percentage : 0,
        total_questions: result.total_questions,
        correct_answers: result.correct_answers,
        time_spent: result.time_spent,
        test_type: result.test_configuration.testTypes.map(t => t.name).join(', '),
        completed_at: result.completed_at
      };

      const { error: historyError } = await this.supabase
        .from('test_history')
        .insert(historyItem);

      if (historyError) {
        console.error('❌ Error saving to test_history:', historyError);
        throw new Error(`Adatbázis hiba test_history táblában: ${historyError.message} (Kód: ${historyError.code})`);
      }
    } catch (error) {
      console.error('❌ saveTestResult failed:', error);
      throw error;
    }
  }

  async loadTestHistory(): Promise<TestHistory[]> {
    const user = this.authService.currentUser;
    if (!user) return [];

    this.isLoading.set(true);
    
    try {
      const { data, error } = await this.supabase
        .from('test_history')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      const history = data || [];
      this.testHistory.set(history);
      return history;
    } finally {
      this.isLoading.set(false);
    }
  }

  private async updateCardPerformance(cardId: string, isCorrect: boolean, timeSpent: number, hintUsed: boolean): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) return;

    try {
      // Check if performance record exists
      const { data: existingPerformance, error: fetchError } = await this.supabase
        .from('card_performance')
        .select('*')
        .eq('user_id', user.id)
        .eq('card_id', cardId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching card performance:', fetchError);
        return;
      }

      const now = new Date().toISOString();

      if (existingPerformance) {
        // Update existing record
        const newCorrectCount = existingPerformance.correct_count + (isCorrect ? 1 : 0);
        const newIncorrectCount = existingPerformance.incorrect_count + (isCorrect ? 0 : 1);
        const newTotalAttempts = existingPerformance.total_attempts + 1;
        const newHintsUsed = existingPerformance.hints_used_count + (hintUsed ? 1 : 0);
        
        // Calculate new average response time
        const totalTime = (existingPerformance.average_response_time * existingPerformance.total_attempts) + timeSpent;
        const newAverageTime = totalTime / newTotalAttempts;

        const { error: updateError } = await this.supabase
          .from('card_performance')
          .update({
            correct_count: newCorrectCount,
            incorrect_count: newIncorrectCount,
            total_attempts: newTotalAttempts,
            average_response_time: newAverageTime,
            hints_used_count: newHintsUsed,
            last_answered_at: now,
            updated_at: now
          })
          .eq('id', existingPerformance.id);

        if (updateError) {
          console.error('Error updating card performance:', updateError);
        }
      } else {
        // Create new record
        const session = this.currentSession();
        if (!session) return;

        const newPerformance: CardPerformance = {
          user_id: user.id,
          quiz_id: session.quiz_id,
          card_id: cardId,
          correct_count: isCorrect ? 1 : 0,
          incorrect_count: isCorrect ? 0 : 1,
          total_attempts: 1,
          average_response_time: timeSpent,
          hints_used_count: hintUsed ? 1 : 0,
          last_answered_at: now
        };

        const { error: insertError } = await this.supabase
          .from('card_performance')
          .insert(newPerformance);

        if (insertError) {
          console.error('Error creating card performance:', insertError);
        }
      }
    } catch (error) {
      console.error('Error in updateCardPerformance:', error);
    }
  }

  async getCardPerformance(quizId: string): Promise<CardPerformance[]> {
    const user = this.authService.currentUser;
    if (!user) return [];

    try {
      const { data, error } = await this.supabase
        .from('card_performance')
        .select('*')
        .eq('user_id', user.id)
        .eq('quiz_id', quizId);

      if (error) {
        console.error('Error fetching card performance:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCardPerformance:', error);
      return [];
    }
  }
}
