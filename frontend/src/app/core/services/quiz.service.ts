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
  front: string; // elsődleges mező
  back: string; // elsődleges mező
  question?: string; // kompatibilitás az adatbázissal
  answer?: string; // kompatibilitás az adatbázissal
  tags: string[]; // nem optional, alapértelmezett üres tömb
  difficulty: 'easy' | 'medium' | 'hard'; // nem optional, alapértelmezett medium
  reviewCount: number; // nem optional, alapértelmezett 0
  successRate: number; // nem optional, alapértelmezett 0
  lastReviewed?: Date;
  nextReview?: Date;
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
      const { data, error } = await this.supabase
        .from('quizzes')
        .select(`
          *,
          quiz_cards (*)
        `)
        .eq('user_id', this.user()?.id);

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
    } finally {
      this.isLoading.set(false);
    }
  }

  async createQuiz(quiz: Omit<Quiz, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await this.supabase
      .from('quizzes')
      .insert({
        name: quiz.name,
        description: quiz.description,
        color: quiz.color,
        visibility: quiz.visibility,
        tags: quiz.tags,
        subject: quiz.subject,
        difficulty_level: quiz.difficulty_level,
        estimated_time: quiz.estimated_time,
        study_modes: quiz.study_modes,
        language: quiz.language,
        project_id: quiz.project_id,
        folder_id: quiz.folder_id,
        user_id: this.user()?.id
      })
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
    // Difficulty string to number conversion
    const difficultyMap: { [key: string]: number } = {
      'easy': 1,
      'medium': 3,
      'hard': 5
    };

    const cardToInsert = {
      quiz_id: quizId,
      question: cardData.front || cardData.question || '',
      answer: cardData.back || cardData.answer || '',
      tags: cardData.tags || [],
      difficulty: difficultyMap[cardData.difficulty || 'medium'] || 3
    };

    const { data, error } = await this.supabase
      .from('quiz_cards')
      .insert(cardToInsert)
      .select()
      .single();

    if (error) throw error;
    
    // Transform data for UI compatibility
    const numberToDifficultyMap: { [key: number]: 'easy' | 'medium' | 'hard' } = {
      1: 'easy',
      2: 'easy',
      3: 'medium',
      4: 'hard',
      5: 'hard'
    };

    return {
      ...data,
      front: data.question,
      back: data.answer,
      difficulty: numberToDifficultyMap[data.difficulty] || 'medium',
      reviewCount: 0,
      successRate: 0
    };
  }

  async updateCard(quizId: string, cardId: string, updates: Partial<QuizCard>): Promise<QuizCard> {
    const updateData: any = {};
    
    // Difficulty string to number conversion
    const difficultyMap: { [key: string]: number } = {
      'easy': 1,
      'medium': 3,
      'hard': 5
    };

    if (updates.front || updates.question) {
      updateData.question = updates.front || updates.question;
    }
    if (updates.back || updates.answer) {
      updateData.answer = updates.back || updates.answer;
    }
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.difficulty !== undefined) updateData.difficulty = difficultyMap[updates.difficulty] || 3;
    if (updates.lastReviewed !== undefined) updateData.last_reviewed = updates.lastReviewed;
    if (updates.nextReview !== undefined) updateData.next_review = updates.nextReview;

    const { data, error } = await this.supabase
      .from('quiz_cards')
      .update(updateData)
      .eq('id', cardId)
      .select()
      .single();

    if (error) throw error;
    
    // Transform data for UI compatibility
    const numberToDifficultyMap: { [key: number]: 'easy' | 'medium' | 'hard' } = {
      1: 'easy',
      2: 'easy',
      3: 'medium',
      4: 'hard',
      5: 'hard'
    };

    return {
      ...data,
      front: data.question,
      back: data.answer,
      difficulty: numberToDifficultyMap[data.difficulty] || 'medium',
      reviewCount: updates.reviewCount ?? 0,
      successRate: updates.successRate ?? 0
    };
  }

  async deleteCard(quizId: string, cardId: string): Promise<void> {
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
      Math.min(30, Math.pow(2, (card.reviewCount || 0))) : 
      1;
    
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  getStudyStats(quiz: Quiz): StudyStats {
    const cards = quiz.cards || [];
    const totalReviews = cards.reduce((sum, card) => sum + (card.reviewCount || 0), 0);
    const averageScore = cards.length > 0 ? 
      cards.reduce((sum, card) => sum + (card.successRate || 0), 0) / cards.length : 0;
    const masteredCards = cards.filter(card => (card.successRate || 0) >= 0.9).length;
    const needsReview = cards.filter(card => 
      !card.nextReview || new Date(card.nextReview) <= new Date()
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
}
