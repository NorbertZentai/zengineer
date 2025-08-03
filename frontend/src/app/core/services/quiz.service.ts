// Supabase service - Teljes backend replacement
import { Injectable, signal, computed } from '@angular/core';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { environment } from '../../../environments/environment';

export interface Project {
  id?: string;
  name: string;
  description?: string;
  color: string;
  visibility: 'private' | 'public';
  tags: string[];
  subject?: string;
  difficulty_level?: number; // 1-5, opcionális
  target_audience: string[];
  language: string;
  user_id?: string;
  folders?: QuizFolder[];
  quizzes?: Quiz[];
  created_at?: string;
  updated_at?: string;
}

export interface Quiz {
  id?: string;
  name: string;
  description?: string;
  color: string;
  visibility: 'private' | 'public';
  tags: string[];
  subject?: string;
  difficulty_level: number; // 1-5
  estimated_time: number; // percben
  study_modes: string[];
  language: string;
  project_id?: string;
  folder_id?: string;
  user_id?: string;
  cards?: QuizCard[];
  created_at?: string;
  updated_at?: string;
}

export interface QuizCard {
  id?: string;
  quiz_id?: string;
  
  // Kötelező mezők
  question: string; // Kérdés vagy állítás
  card_type: 'flashcard' | 'multiple_choice'; // Kártya típusa
  
  // Opcionális mezők
  hint?: string; // Segítő tipp
  
  // Flashcard típushoz
  answer?: string; // Egyszerű válasz flashcard esetén
  
  // Multiple choice típushoz
  // correct_answers és incorrect_answers eltávolítva, minden válasz az answer mezőben (JSON)
  
  // Metadata
  tags?: string[];
  difficulty?: number; // 1-5
  
  // Tanulási algoritmus mezők
  review_count?: number;
  success_rate?: number; // 0-100 százalék
  last_reviewed?: Date | string;
  next_review?: Date | string;
  
  // UI állapot mezők
  isFlipped?: boolean; // Flip animációhoz
  
  // Kompatibilitás régi mezőkkel
  front?: string; // kompatibilitás
  back?: string; // kompatibilitás
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface QuizFolder {
  id?: string;
  name: string;
  description?: string;
  color: string;
  visibility: 'private' | 'public';
  tags: string[];
  order_index: number;
  project_id: string; // kötelező parent
  user_id?: string;
  quizzes?: Quiz[];
  created_at?: string;
  updated_at?: string;
}

export interface StudySession {
  id?: string;
  quiz_id?: string;
  user_id?: string;
  score: number;
  total_questions: number;
  correctAnswers: number;
  totalAnswers: number;
  cardsReviewed?: string[];
  duration_seconds?: number;
  completed_at?: string;
}

export interface StudySettings {
  shuffleCards: boolean;
  showHints: boolean;
  timeLimit?: number;
}

export interface StudyStats {
  totalCards: number;
  totalReviews: number;
  averageScore: number;
  averageSuccessRate: number;
  streakDays: number;
  masteredCards: number;
  needsReview: number;
}

@Injectable({
  providedIn: 'root'
})
export class QuizService {
  private supabase: SupabaseClient;
  private initPromise: Promise<void>;
  
  // Reactive state
  user = signal<User | null>(null);
  // ...existing code...
  quizzes = signal<Quiz[]>([]);
  folders = signal<QuizFolder[]>([]);
  isLoading = signal(false);
  
  // Additional state for compatibility
  private _currentProject = signal<Project | null>(null);
  private _currentFolder = signal<QuizFolder | null>(null);
  private _searchQuery = signal('');
  
  // Public readonly signals for compatibility
  currentProject = this._currentProject.asReadonly();
  currentFolder = this._currentFolder.asReadonly();
  searchQuery = this._searchQuery.asReadonly();
  
  // Computed values for compatibility
  filteredQuizzes = computed(() => {
    const query = this._searchQuery().toLowerCase();
    if (!query) return this.quizzes();
    return this.quizzes().filter(quiz => 
      quiz.name.toLowerCase().includes(query) ||
      quiz.description?.toLowerCase().includes(query)
    );
  });
  
  allQuizzes = this.quizzes.asReadonly();

  constructor() {
    this.supabase = SupabaseService.getClient();

    // Initialize auth state
    this.initPromise = this.initializeAuth();
  }

  private async initializeAuth() {
    // Check for existing session on page load/refresh
    const { data: { session } } = await this.supabase.auth.getSession();
    this.user.set(session?.user ?? null);
    
    // Listen to auth changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.user.set(session?.user ?? null);
      if (session?.user) {
        this.loadUserData();
      } else {
        this.clearUserData();
      }
    });
  }

  // Method to ensure initialization is complete
  async waitForInit(): Promise<void> {
    return this.initPromise;
  }

  // 🔐 AUTH METHODS
  async signUp(email: string, password: string, name: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    
    if (error) throw error;
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
    this.clearUserData();
  }

  // 🎯 PROJECT METHODS
  // ...existing code...

  async createProject(project: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    // ...existing code...
  }

  async updateProject(id: string, updates: Partial<Project>) {
    // ...existing code...
  }

  async deleteProject(id: string) {
    // ...existing code...
  }

  selectProject(project: Project | null): void {
    this._currentProject.set(project);
    this._currentFolder.set(null); // Reset folder when changing project
  }

  // 📚 QUIZ METHODS
  async loadQuizzes() {
    this.isLoading.set(true);
    try {
      // Várjuk meg az inicializációt
      await this.waitForInit();
      
      const user = this.user();
      if (!user || !user.id) {
        throw new Error('Nincs bejelentkezett felhasználó. Jelentkezz be!');
      }
      
      const { data, error } = await this.supabase
        .from('quizzes')
        .select(`
          *,
          quiz_cards (*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      // Transform data for UI compatibility
      const numberToDifficultyMap: { [key: number]: 'easy' | 'medium' | 'hard' } = {
        1: 'easy',
        2: 'easy',
        3: 'medium',
        4: 'hard',
        5: 'hard'
      };

      const transformedQuizzes = (data || []).map(quiz => ({
        ...quiz,
        cards: (quiz.quiz_cards || []).map((card: any) => ({
          ...card,
          front: card.question || card.front || '',
          back: card.answer || card.back || '',
          tags: card.tags || [],
          difficulty: numberToDifficultyMap[card.difficulty] || 'medium',
          reviewCount: card.reviewCount || 0,
          successRate: card.successRate || 0
        }))
      }));

      this.quizzes.set(transformedQuizzes);
    } catch (err) {
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async createQuiz(quiz: Omit<Quiz, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    // Csak az alapvető mezőket küldjük el, amelyek biztosan léteznek
    const quizData: any = {
      name: quiz.name,
      description: quiz.description || null,
      color: quiz.color || '#667eea',
      // visibility: quiz.visibility || 'private', // Eltávolítva amíg az oszlop nem létezik
      // tags: quiz.tags || [], // Eltávolítva amíg az oszlop nem létezik
      user_id: this.user()?.id
    };

    // Csak akkor adjuk hozzá, ha meg van adva és létezik az oszlop
    if (quiz.subject) {
      quizData.subject = quiz.subject;
    }
    if (quiz.project_id) {
      quizData.project_id = quiz.project_id;
    }
    if (quiz.folder_id) {
      quizData.folder_id = quiz.folder_id;
    }

    const { data, error } = await this.supabase
      .from('quizzes')
      .insert(quizData)
      .select()
      .single();

    if (error) throw error;
    await this.loadQuizzes(); // Refresh list
    return data;
  }

  async updateQuiz(id: string, updates: Partial<Quiz>) {
    const { data, error } = await this.supabase
      .from('quizzes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', this.user()?.id)
      .select()
      .single();

    if (error) throw error;
    await this.loadQuizzes(); // Refresh list
    return data;
  }

  async deleteQuiz(id: string) {
    const { error } = await this.supabase
      .from('quizzes')
      .delete()
      .eq('id', id)
      .eq('user_id', this.user()?.id);

    if (error) throw error;
    await this.loadQuizzes(); // Refresh list
  }

  // 📁 FOLDER METHODS
  async loadFolders() {
    // ...existing code...
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('quiz_folders')
        .select('*')
        .eq('user_id', this.user()?.id);

      if (error) {
        console.error('Error loading folders:', error);
        throw error;
      }
      
      // ...existing code...
      this.folders.set(data || []);
    } finally {
      this.isLoading.set(false);
    }
  }

  async createFolder(folder: Omit<QuizFolder, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    // ...existing code...
    // ...existing code...
    
    const { data, error } = await this.supabase
      .from('quiz_folders')
      .insert({
        name: folder.name,
        description: folder.description,
        color: folder.color,
        visibility: folder.visibility,
        tags: folder.tags,
        order_index: folder.order_index,
        project_id: folder.project_id,
        user_id: this.user()?.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
    
    // ...existing code...
    await this.loadFolders(); // Refresh list
    // ...existing code...
    return data;
  }

  async deleteFolder(folderId: string): Promise<void> {
    const { error } = await this.supabase
      .from('quiz_folders')
      .delete()
      .eq('id', folderId);

    if (error) throw error;
    await this.loadFolders(); // Refresh list
  }

  // 🃏 QUIZ CARDS METHODS
  async addQuizCard(quizId: string, card: Omit<QuizCard, 'id' | 'quiz_id'>) {
    const { data, error } = await this.supabase
      .from('quiz_cards')
      .insert({
        ...card,
        quiz_id: quizId
      })
      .select()
      .single();

    if (error) throw error;
    await this.loadQuizzes(); // Refresh quiz data
    return data;
  }

  async updateQuizCard(id: string, updates: Partial<QuizCard>) {
    const { data, error } = await this.supabase
      .from('quiz_cards')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await this.loadQuizzes(); // Refresh quiz data
    return data;
  }

  async deleteQuizCard(id: string) {
    const { error } = await this.supabase
      .from('quiz_cards')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await this.loadQuizzes(); // Refresh quiz data
  }

  // 🔄 REAL-TIME SUBSCRIPTIONS
  subscribeToQuizzes() {
    return this.supabase
      .channel('quizzes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'quizzes',
          filter: `user_id=eq.${this.user()?.id}`
        }, 
        () => {
          this.loadQuizzes(); // Auto-refresh on changes
        }
      )
      .subscribe();
  }

  // 🧹 UTILITY METHODS
  private async loadUserData() {
    await Promise.all([
      // ...existing code...
      this.loadQuizzes(),
      this.loadFolders()
    ]);
  }

  private clearUserData() {
    // ...existing code...
    this.quizzes.set([]);
    this.folders.set([]);
    this._currentProject.set(null);
    this._currentFolder.set(null);
  }

  // 🔧 COMPATIBILITY METHODS for existing components
  selectFolder(folder: QuizFolder | null): void {
    this._currentFolder.set(folder);
  }
  
  selectQuiz(quiz: Quiz): void {
    // Navigate to quiz or set current quiz if needed
    // ...existing code...
  }
  
  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }
  
  getCardsNeedingReview(quiz: Quiz): QuizCard[] {
    // Mock implementation - would need real study session data
    return quiz.cards?.slice(0, Math.floor(Math.random() * (quiz.cards.length + 1))) || [];
  }

  // 📊 STATISTICS
  async getQuizStats(quizId: string) {
    const { data, error } = await this.supabase
      .from('quiz_sessions')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('user_id', this.user()?.id);

    if (error) throw error;
    return data;
  }

  // CARD MANAGEMENT
  async addCard(quizId: string, cardData: Partial<QuizCard>): Promise<QuizCard> {
    try {
      // ...existing code...
      
      // Használjuk a RÉGI schema formátumot
      const legacyCard = {
        quiz_id: quizId,
        question: cardData.question || '',
        // A régi schemában csak 'answer' mező van, nem 'card_type'
        answer: this.convertToLegacyAnswer(cardData),
        difficulty: cardData.difficulty || 1,
        tags: JSON.stringify(cardData.tags || [])
      };

      // ...existing code...

      const { data, error } = await this.supabase
        .from('quiz_cards')
        .insert(legacyCard)
        .select()
        .single();

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
      
      // ...existing code...
      
      // Konvertáljuk vissza az új formátumra a UI számára
      return this.convertFromLegacy(data, cardData);
      
    } catch (err) {
      console.error('❌ Error adding card:', err);
      throw err;
    }
  }

  private convertToLegacyAnswer(cardData: Partial<QuizCard>): string {
    if (cardData.card_type === 'flashcard' || !cardData.card_type) {
      // Flashcard: egyszerű válasz
      return cardData.answer || '';
    } else {
      // Multiple choice: JSON formátumban tároljuk a válaszokat
      let correct: string[] = [];
      let incorrect: string[] = [];
      let hint: string | undefined = cardData.hint;
      // Ha az answer mező már tartalmazza a helyes/hibás válaszokat, próbáljuk meg kinyerni
      if (cardData.answer) {
        try {
          const parsed = JSON.parse(cardData.answer);
          if (parsed.type === 'multiple_choice') {
            correct = parsed.correct || [];
            incorrect = parsed.incorrect || [];
            hint = parsed.hint;
          }
        } catch {}
      }
      const mcData = {
        type: 'multiple_choice',
        correct,
        incorrect,
        hint
      };
      return JSON.stringify(mcData);
    }
  }

  private convertFromLegacy(legacyData: any, originalCardData: Partial<QuizCard>): QuizCard {
    let tagsArr: string[] = [];
    if (typeof legacyData.tags === 'string' && legacyData.tags.trim().startsWith('[') && legacyData.tags.trim().endsWith(']')) {
      try {
        tagsArr = JSON.parse(legacyData.tags);
      } catch {
        tagsArr = [];
      }
    } else if (Array.isArray(legacyData.tags)) {
      tagsArr = legacyData.tags;
    } else {
      tagsArr = [];
    }
    let convertedCard: QuizCard = {
      ...legacyData,
      tags: tagsArr
    };

    // Ha az answer mező nem üres és JSON-nek tűnik, csak akkor próbáljuk meg parse-olni
    const answerStr = legacyData.answer;
    const looksLikeJson = typeof answerStr === 'string' && answerStr.trim().startsWith('{') && answerStr.trim().endsWith('}');
    if (looksLikeJson) {
      try {
        const parsedAnswer = JSON.parse(answerStr);
        if (parsedAnswer.type === 'multiple_choice') {
          convertedCard.card_type = 'multiple_choice';
          convertedCard.answer = answerStr;
          convertedCard.hint = parsedAnswer.hint;
        } else {
          // Nem MC, flashcardként kezeljük
          convertedCard.card_type = 'flashcard';
          convertedCard.answer = answerStr;
        }
      } catch {
        // Parse error, flashcardként kezeljük
        convertedCard.card_type = 'flashcard';
        convertedCard.answer = answerStr;
      }
    } else {
      // Nem JSON, flashcardként kezeljük
      convertedCard.card_type = 'flashcard';
      convertedCard.answer = answerStr;
    }
    if (originalCardData.hint) {
      convertedCard.hint = originalCardData.hint;
    }
    return convertedCard;
  }

  async updateCard(quizId: string, cardId: string, updates: Partial<QuizCard>): Promise<QuizCard> {
    const updateData: any = {};

    if (updates.question !== undefined) updateData.question = updates.question;
    if (updates.answer !== undefined) updateData.answer = updates.answer;
    if (updates.card_type !== undefined) updateData.card_type = updates.card_type;
    if (updates.hint !== undefined) updateData.hint = updates.hint;
    if (updates.tags !== undefined) updateData.tags = JSON.stringify(updates.tags);
    if (updates.difficulty !== undefined) updateData.difficulty = updates.difficulty;
    if (updates.review_count !== undefined) updateData.review_count = updates.review_count;
    if (updates.success_rate !== undefined) updateData.success_rate = updates.success_rate;
    if (updates.last_reviewed !== undefined) updateData.last_reviewed = updates.last_reviewed;
    if (updates.next_review !== undefined) updateData.next_review = updates.next_review;

    const { data, error } = await this.supabase
      .from('quiz_cards')
      .update(updateData)
      .eq('id', cardId)
      .select()
      .single();

    if (error) throw error;
    
    // Parse JSON fields back for UI
    return {
      ...data,
      tags: data.tags ? JSON.parse(data.tags) : []
    };
  }

  async deleteCard(cardId: string): Promise<void> {
    const { error } = await this.supabase
      .from('quiz_cards')
      .delete()
      .eq('id', cardId);

    if (error) throw error;
  }

  // STUDY SESSION MANAGEMENT
  startStudySession(quiz: Quiz): StudySession {
    return {
      quiz_id: quiz.id,
      user_id: this.user()?.id,
      score: 0,
      total_questions: quiz.cards?.length || 0,
      correctAnswers: 0,
      totalAnswers: 0,
      cardsReviewed: []
    };
  }

  updateStudySession(updates: Partial<StudySession>): void {
    // For now, just log the update - in a real app, you'd save to state/database
    // ...existing code...
  }

  endStudySession(session: StudySession): Promise<StudySession> {
    // Mock implementation - would save session to database
    return Promise.resolve({
      ...session,
      completed_at: new Date().toISOString()
    });
  }

  calculateNextReview(card: QuizCard, isCorrect: boolean): Date {
    const now = new Date();
    const days = isCorrect ? 
      Math.min(30, Math.pow(2, (card.review_count || 0))) : 
      1;
    
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  getStudyStats(quiz: Quiz): StudyStats {
    const cards = quiz.cards || [];
    const totalReviews = cards.reduce((sum, card) => sum + (card.review_count || 0), 0);
    const averageScore = cards.length > 0 ? 
      cards.reduce((sum, card) => sum + (card.success_rate || 0), 0) / cards.length : 0;
    const masteredCards = cards.filter(card => (card.success_rate || 0) >= 0.9).length;
    const needsReview = cards.filter(card => 
      !card.next_review || new Date(card.next_review) <= new Date()
    ).length;
    
    return {
      totalCards: cards.length,
      totalReviews,
      averageScore,
      averageSuccessRate: averageScore,
      streakDays: 0, // Would calculate from real session data
      masteredCards,
      needsReview
    };
  }

  // FOLDER MANAGEMENT
  async updateFolder(folderId: string, updates: Partial<QuizFolder>): Promise<QuizFolder> {
    const { data, error } = await this.supabase
      .from('quiz_folders')
      .update(updates)
      .eq('id', folderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // QUIZ DETAILS METHODS
  async getQuizById(quizId: string): Promise<Quiz> {
    const { data, error } = await this.supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    if (error) throw error;
    return data;
  }

  async getQuizCards(quizId: string): Promise<QuizCard[]> {
    const { data, error } = await this.supabase
      .from('quiz_cards')
      .select('*')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Konvertáljuk a legacy formátumot új formátumra
    return (data || []).map(card => this.convertFromLegacy(card, {}));
  }

  // törölve: duplikált createCard deklaráció
  async createCard(cardData: Partial<QuizCard>): Promise<QuizCard> {
    // Csak a quiz_cards tábla mezőit mentjük, minden mezőt pontosan másolunk
    let answerValue = cardData.answer;
    // Mindig pontosan másoljuk az answer mezőt, csak akkor legyen üres string, ha null vagy undefined
    if (answerValue == null) answerValue = '';
    const cardPayload: any = {
      quiz_id: cardData.quiz_id,
      question: cardData.question,
      answer: answerValue,
      tags: cardData.tags,
      difficulty: cardData.difficulty
    };

    const { data, error } = await this.supabase
      .from('quiz_cards')
      .insert(cardPayload)
      .select()
      .single();

    if (error || !data) {
      // Ha nincs adat vagy hiba van, dobjunk értelmes hibát
      throw new Error(error?.message || 'Card creation failed, no data returned');
    }
    // A visszaadott adatot kiegészítjük a hiányzó mezőkkel
    return {
      ...data,
      tags: data.tags || [],
      difficulty: data.difficulty || 'medium',
      reviewCount: data.reviewCount || 0,
      successRate: data.successRate || 0
    };
  }
}
