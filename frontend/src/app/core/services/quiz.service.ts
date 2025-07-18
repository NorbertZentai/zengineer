// Supabase service - Teljes backend replacement
import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
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
  correct_answers?: string[]; // Helyes válaszok tömbje
  incorrect_answers?: string[]; // Helytelen válaszok tömbje
  
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
  projects = signal<Project[]>([]);
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
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );

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
  async loadProjects() {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .select('*')
        .eq('user_id', this.user()?.id);

      if (error) throw error;
      this.projects.set(data || []);
    } finally {
      this.isLoading.set(false);
    }
  }

  async createProject(project: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await this.supabase
      .from('projects')
      .insert({
        name: project.name,
        description: project.description,
        color: project.color,
        visibility: project.visibility,
        tags: project.tags,
        subject: project.subject,
        difficulty_level: project.difficulty_level,
        target_audience: project.target_audience,
        language: project.language,
        user_id: this.user()?.id
      })
      .select()
      .single();

    if (error) throw error;
    await this.loadProjects();
    return data;
  }

  async updateProject(id: string, updates: Partial<Project>) {
    const { data, error } = await this.supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .eq('user_id', this.user()?.id)
      .select()
      .single();

    if (error) throw error;
    await this.loadProjects();
    return data;
  }

  async deleteProject(id: string) {
    const { error } = await this.supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', this.user()?.id);

    if (error) throw error;
    await this.loadProjects();
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
    console.log('Loading folders for user:', this.user()?.id);
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
      
      console.log('Loaded folders:', data);
      this.folders.set(data || []);
    } finally {
      this.isLoading.set(false);
    }
  }

  async createFolder(folder: Omit<QuizFolder, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    console.log('Creating folder:', folder);
    console.log('Current user:', this.user()?.id);
    
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
    
    console.log('Folder created successfully:', data);
    await this.loadFolders(); // Refresh list
    console.log('Current folders after refresh:', this.folders());
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
      this.loadProjects(),
      this.loadQuizzes(),
      this.loadFolders()
    ]);
  }

  private clearUserData() {
    this.projects.set([]);
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
    console.log('Selected quiz:', quiz);
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
      console.log('🔄 Adding card with legacy schema compatibility...');
      
      // Használjuk a RÉGI schema formátumot
      const legacyCard = {
        quiz_id: quizId,
        question: cardData.question || '',
        // A régi schemában csak 'answer' mező van, nem 'card_type'
        answer: this.convertToLegacyAnswer(cardData),
        difficulty: cardData.difficulty || 1,
        tags: JSON.stringify(cardData.tags || [])
      };

      console.log('📤 Inserting legacy format:', legacyCard);

      const { data, error } = await this.supabase
        .from('quiz_cards')
        .insert(legacyCard)
        .select()
        .single();

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
      
      console.log('✅ Card inserted successfully:', data);
      
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
      const mcData = {
        type: 'multiple_choice',
        correct: cardData.correct_answers || [],
        incorrect: cardData.incorrect_answers || [],
        hint: cardData.hint
      };
      return JSON.stringify(mcData);
    }
  }

  private convertFromLegacy(legacyData: any, originalCardData: Partial<QuizCard>): QuizCard {
    let convertedCard: QuizCard = {
      ...legacyData,
      tags: legacyData.tags ? JSON.parse(legacyData.tags) : []
    };

    // Próbáljuk meg kitalálni, hogy ez multiple choice vagy flashcard
    try {
      const parsedAnswer = JSON.parse(legacyData.answer);
      if (parsedAnswer.type === 'multiple_choice') {
        // Ez egy multiple choice kártya volt
        convertedCard.card_type = 'multiple_choice';
        convertedCard.correct_answers = parsedAnswer.correct || [];
        convertedCard.incorrect_answers = parsedAnswer.incorrect || [];
        convertedCard.hint = parsedAnswer.hint;
        convertedCard.answer = undefined;
      } else {
        throw new Error('Not MC format');
      }
    } catch {
      // Ez egy egyszerű flashcard
      convertedCard.card_type = 'flashcard';
      convertedCard.answer = legacyData.answer;
      convertedCard.correct_answers = [];
      convertedCard.incorrect_answers = [];
      if (originalCardData.hint) {
        convertedCard.hint = originalCardData.hint;
      }
    }

    return convertedCard;
  }

  async updateCard(quizId: string, cardId: string, updates: Partial<QuizCard>): Promise<QuizCard> {
    const updateData: any = {};

    if (updates.question !== undefined) updateData.question = updates.question;
    if (updates.answer !== undefined) updateData.answer = updates.answer;
    if (updates.correct_answers !== undefined) updateData.correct_answers = JSON.stringify(updates.correct_answers);
    if (updates.incorrect_answers !== undefined) updateData.incorrect_answers = JSON.stringify(updates.incorrect_answers);
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
      correct_answers: data.correct_answers ? JSON.parse(data.correct_answers) : [],
      incorrect_answers: data.incorrect_answers ? JSON.parse(data.incorrect_answers) : [],
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
    console.log('Study session updated:', updates);
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

  async createCard(cardData: {
    quiz_id: string;
    front: string;
    back: string;
    hint?: string;
  }): Promise<QuizCard> {
    // Csak az alapvető mezőket küldjük el, amelyek biztosan léteznek az adatbázisban
    const cardPayload: any = {
      quiz_id: cardData.quiz_id,
      front: cardData.front,
      back: cardData.back,
      user_id: this.user()?.id
    };

    // Opcionális mezők hozzáadása, ha meg vannak adva
    if (cardData.hint) {
      cardPayload.hint = cardData.hint;
    }

    const { data, error } = await this.supabase
      .from('quiz_cards')
      .insert(cardPayload)
      .select()
      .single();

    if (error) throw error;
    
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
