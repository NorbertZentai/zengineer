import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
}

export interface TestType {
  id: 'flashcard' | 'multiple_choice' | 'written' | 'mixed';
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
  type: 'flashcard' | 'multiple_choice' | 'written';
  options?: string[];
  correct_answer?: string;
  correct_answers?: string[];
  hint?: string;
  difficulty?: number;
  order: number;
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
      id: 'mixed',
      name: 'Vegyes',
      description: 'Különböző típusú kérdések keverve',
      enabled: false
    }
  ];

  constructor(private authService: AuthService) {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
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
    let selectedCards = [...cards];
    
    // Apply question count limit if specified
    if (config.questionCount && config.questionCount > 0 && config.questionCount < cards.length) {
      if (config.shuffleQuestions) {
        selectedCards = this.shuffleArray(selectedCards);
      }
      selectedCards = selectedCards.slice(0, config.questionCount);
    }
    
    const questions: TestQuestion[] = [];
    
    selectedCards.forEach((card, index) => {
      // Determine question type based on configuration
      const enabledTypes = config.testTypes.filter(t => t.enabled);
      if (enabledTypes.length === 0) {
        throw new Error('Legalább egy teszt típust ki kell választani');
      }

      let questionType: TestType;
      if (enabledTypes.find(t => t.id === 'mixed')) {
        // Mixed mode - randomly choose type
        const randomIndex = Math.floor(Math.random() * enabledTypes.filter(t => t.id !== 'mixed').length);
        questionType = enabledTypes.filter(t => t.id !== 'mixed')[randomIndex] || enabledTypes[0];
      } else {
        // Use first enabled type
        questionType = enabledTypes[0];
      }

      const question: TestQuestion = {
        id: `q_${index}`,
        card_id: card.id!,
        question: card.question,
        type: questionType.id === 'mixed' ? 'flashcard' : questionType.id as any,
        hint: config.showHints ? card.hint : undefined,
        difficulty: card.difficulty,
        order: index
      };

      // Set up answer options for multiple choice
      if (question.type === 'multiple_choice') {
        // Generate options dynamically
        const correctAnswer = this.formatAnswer(card.answer);
        const incorrectOptions = this.generateIncorrectOptions(cards, card, 3);
        
        const allOptions = [correctAnswer, ...incorrectOptions].filter(opt => opt != null);
        question.options = config.shuffleQuestions ? this.shuffleArray(allOptions) : allOptions;
        question.correct_answer = correctAnswer;
      } else {
        question.correct_answer = this.formatAnswer(card.answer);
      }

      questions.push(question);
    });

    return config.shuffleQuestions ? this.shuffleArray(questions) : questions;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private formatAnswer(answer: any): string {
    if (typeof answer === 'string') {
      try {
        // Try to parse as JSON if it looks like JSON
        if (answer.trim().startsWith('{') || answer.trim().startsWith('[')) {
          const parsed = JSON.parse(answer);
          
          // If it's an object with a 'correct' property, extract that
          if (typeof parsed === 'object' && parsed.correct) {
            return parsed.correct;
          }
          
          // If it's an array, join with commas
          if (Array.isArray(parsed)) {
            return parsed.join(', ');
          }
          
          // If it's a simple object, try to extract meaningful text
          if (typeof parsed === 'object') {
            // Look for common answer fields
            const answerFields = ['answer', 'text', 'value', 'correct', 'solution'];
            for (const field of answerFields) {
              if (parsed[field]) {
                return parsed[field];
              }
            }
            
            // If no specific field found, return the first string value
            const firstStringValue = Object.values(parsed).find(val => typeof val === 'string');
            if (firstStringValue) {
              return firstStringValue as string;
            }
          }
          
          return JSON.stringify(parsed);
        }
        
        return answer;
      } catch (e) {
        // If parsing fails, return the original string
        return answer;
      }
    }
    
    // If it's not a string, convert to string
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

    const isCorrect = this.checkAnswer(question, answer);
    
    const testAnswer: TestAnswer = {
      question_id: questionId,
      answer,
      is_correct: isCorrect,
      time_spent: timeSpent,
      attempts: 1,
      hint_used: hintUsed,
      answered_at: new Date().toISOString()
    };

    // Update session
    const updatedAnswers = [...session.answers, testAnswer];
    const correctAnswers = updatedAnswers.filter(a => a.is_correct).length;
    
    const updatedSession = {
      ...session,
      answers: updatedAnswers,
      correct_answers: correctAnswers,
      current_question_index: session.current_question_index + 1
    };

    this.currentSession.set(updatedSession);

    // Update card performance statistics
    await this.updateCardPerformance(question.card_id, isCorrect, timeSpent, hintUsed);

    // Save to database
    await this.updateSession(updatedSession);
  }

  private checkAnswer(question: TestQuestion, answer: string | string[]): boolean {
    if (question.type === 'multiple_choice') {
      const userAnswer = Array.isArray(answer) ? answer[0] : answer;
      const correctAnswer = question.correct_answer;
      return userAnswer === correctAnswer;
    } else {
      const userAnswer = Array.isArray(answer) ? answer[0] : answer;
      const correctAnswer = question.correct_answer;
      
      // Ensure both values are strings before comparison
      const userAnswerStr = String(userAnswer || '').toLowerCase().trim();
      const correctAnswerStr = String(correctAnswer || '').toLowerCase().trim();
      
      return userAnswerStr === correctAnswerStr;
    }
  }

  async completeTest(): Promise<TestResult> {
    try {
      console.log('🔄 Starting completeTest in service...');
      
      const session = this.currentSession();
      if (!session) {
        throw new Error('Nincs aktív teszt session');
      }
      
      console.log('📊 Current session:', session);

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
      
      console.log('📋 Created test result object:', result);

      // Update session status
      console.log('🔄 Updating session status...');
      const completedSession = {
        ...session,
        status: 'completed' as const,
        end_time: endTime
      };

      await this.updateSession(completedSession);
      console.log('✅ Session updated successfully');

      // Save result to history
      console.log('💾 Saving test result...');
      await this.saveTestResult(result);
      console.log('✅ Test result saved successfully');

      this.currentSession.set(null);
      console.log('🧹 Session cleared');
      
      return result;
    } catch (error) {
      console.error('❌ completeTest failed:', error);
      throw error;
    }
  }

  private async updateSession(session: TestSession): Promise<void> {
    if (!session.id) return;

    try {
      console.log('🔄 Updating test session:', session.id);
      
      const { error } = await this.supabase
        .from('test_sessions')
        .update(session)
        .eq('id', session.id);

      if (error) {
        console.error('❌ Error updating session:', error);
        throw new Error(`Adatbázis hiba test_sessions táblában: ${error.message} (Kód: ${error.code})`);
      }
      
      console.log('✅ Session updated successfully');
    } catch (error) {
      console.error('❌ updateSession failed:', error);
      throw error;
    }
  }

  private async saveTestResult(result: TestResult): Promise<void> {
    try {
      console.log('💾 Saving test result to test_results table:', result);
      
      const { error } = await this.supabase
        .from('test_results')
        .insert(result);

      if (error) {
        console.error('❌ Error saving to test_results:', error);
        throw new Error(`Adatbázis hiba test_results táblában: ${error.message} (Kód: ${error.code})`);
      }
      
      console.log('✅ Test result saved successfully');

      // Add to test history
      console.log('📋 Adding to test history...');
      const historyItem: TestHistory = {
        user_id: result.user_id,
        quiz_id: result.quiz_id,
        quiz_name: result.quiz_name,
        score: result.score,
        percentage: result.percentage,
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
      
      console.log('✅ Test history saved successfully');
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

  async deleteTestSession(sessionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('test_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
  }

  getCurrentQuestion(): TestQuestion | null {
    const session = this.currentSession();
    if (!session) return null;
    
    return session.questions[session.current_question_index] || null;
  }

  getProgress(): { current: number; total: number; percentage: number } {
    const session = this.currentSession();
    if (!session) return { current: 0, total: 0, percentage: 0 };
    
    const current = session.current_question_index;
    const total = session.total_questions;
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    
    return { current, total, percentage };
  }

  isTestCompleted(): boolean {
    const session = this.currentSession();
    if (!session) return false;
    
    return session.current_question_index >= session.total_questions;
  }

  getRemainingTime(): number | null {
    const session = this.currentSession();
    if (!session || !session.configuration.timeLimit) return null;
    
    const elapsed = Math.floor((Date.now() - new Date(session.start_time).getTime()) / 1000);
    const remaining = (session.configuration.timeLimit * 60) - elapsed;
    
    return Math.max(0, remaining);
  }

  pauseTest(): void {
    const session = this.currentSession();
    if (session) {
      this.currentSession.set({ ...session, status: 'paused' });
    }
  }

  resumeTest(): void {
    const session = this.currentSession();
    if (session) {
      this.currentSession.set({ ...session, status: 'active' });
    }
  }
}
