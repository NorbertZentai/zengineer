import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import PocketBase from 'pocketbase';

export interface QuizCard {
  id?: string;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  lastReviewed?: Date;
  nextReview?: Date;
  reviewCount: number;
  successRate: number;
  tags: string[];
  created: Date;
  updated: Date;
}

export interface Quiz {
  id?: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  cards: QuizCard[];
  folderId?: string;
  isPublic: boolean;
  tags: string[];
  created: Date;
  updated: Date;
  studySettings: StudySettings;
}

export interface QuizFolder {
  id?: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  parentId?: string;
  children: QuizFolder[];
  quizzes: Quiz[];
  created: Date;
  updated: Date;
}

export interface StudySettings {
  shuffleCards: boolean;
  showBackFirst: boolean;
  autoAdvance: boolean;
  timeLimit?: number;
  repetitionAlgorithm: 'simple' | 'spaced';
}

export interface StudySession {
  id?: string;
  quizId: string;
  startTime: Date;
  endTime?: Date;
  correctAnswers: number;
  totalAnswers: number;
  cardsReviewed: string[];
  settings: StudySettings;
}

export interface StudyStats {
  totalCards: number;
  masteredCards: number;
  needsReview: number;
  averageSuccessRate: number;
  totalStudyTime: number;
  streak: number;
}

@Injectable({
  providedIn: 'root'
})
export class QuizService {
  private pb = new PocketBase('http://localhost:8090');
  
  // Signals for reactive state management
  private _folders = signal<QuizFolder[]>([]);
  private _currentFolder = signal<QuizFolder | null>(null);
  private _currentQuiz = signal<Quiz | null>(null);
  private _studySession = signal<StudySession | null>(null);
  private _isLoading = signal(false);
  private _searchQuery = signal('');

  // Public readonly signals
  folders = this._folders.asReadonly();
  currentFolder = this._currentFolder.asReadonly();
  currentQuiz = this._currentQuiz.asReadonly();
  studySession = this._studySession.asReadonly();
  isLoading = this._isLoading.asReadonly();
  searchQuery = this._searchQuery.asReadonly();

  // Computed values
  filteredQuizzes = computed(() => {
    const query = this._searchQuery().toLowerCase();
    if (!query) return this._currentFolder()?.quizzes || [];
    
    return this._currentFolder()?.quizzes.filter(quiz => 
      quiz.name.toLowerCase().includes(query) ||
      quiz.tags.some(tag => tag.toLowerCase().includes(query))
    ) || [];
  });

  allQuizzes = computed(() => {
    const allQuizzes: Quiz[] = [];
    const collectQuizzes = (folders: QuizFolder[]) => {
      folders.forEach(folder => {
        allQuizzes.push(...folder.quizzes);
        collectQuizzes(folder.children);
      });
    };
    collectQuizzes(this._folders());
    return allQuizzes;
  });

  constructor() {
    this.loadFolders();
  }

  // Folder Management
  async loadFolders(): Promise<void> {
    this._isLoading.set(true);
    try {
      // Simulate API call - replace with actual PocketBase integration
      const mockFolders: QuizFolder[] = [
        {
          id: '1',
          name: 'Programozás',
          color: '#1976d2',
          icon: 'code',
          children: [],
          quizzes: [],
          created: new Date(),
          updated: new Date()
        }
      ];
      this._folders.set(mockFolders);
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  async createFolder(name: string, parentId?: string): Promise<QuizFolder> {
    const newFolder: QuizFolder = {
      id: Date.now().toString(),
      name,
      color: '#1976d2',
      icon: 'folder',
      parentId,
      children: [],
      quizzes: [],
      created: new Date(),
      updated: new Date()
    };

    if (parentId) {
      this.addFolderToParent(newFolder, parentId);
    } else {
      this._folders.update(folders => [...folders, newFolder]);
    }

    return newFolder;
  }

  async updateFolder(id: string, updates: Partial<QuizFolder>): Promise<void> {
    this._folders.update(folders => 
      this.updateFolderRecursive(folders, id, updates)
    );
  }

  async deleteFolder(id: string): Promise<void> {
    this._folders.update(folders => 
      this.removeFolderRecursive(folders, id)
    );
  }

  // Quiz Management
  async createQuiz(name: string, folderId?: string): Promise<Quiz> {
    const newQuiz: Quiz = {
      id: Date.now().toString(),
      name,
      color: '#4caf50',
      icon: 'quiz',
      cards: [],
      folderId,
      isPublic: false,
      tags: [],
      created: new Date(),
      updated: new Date(),
      studySettings: {
        shuffleCards: true,
        showBackFirst: false,
        autoAdvance: false,
        repetitionAlgorithm: 'spaced'
      }
    };

    if (folderId) {
      this.addQuizToFolder(newQuiz, folderId);
    }

    return newQuiz;
  }

  async updateQuiz(id: string, updates: Partial<Quiz>): Promise<void> {
    this._folders.update(folders => 
      this.updateQuizRecursive(folders, id, updates)
    );
  }

  async deleteQuiz(id: string): Promise<void> {
    this._folders.update(folders => 
      this.removeQuizRecursive(folders, id)
    );
  }

  // Card Management
  async addCard(quizId: string, card: Omit<QuizCard, 'id' | 'created' | 'updated'>): Promise<QuizCard> {
    const newCard: QuizCard = {
      ...card,
      id: Date.now().toString(),
      created: new Date(),
      updated: new Date()
    };

    this._folders.update(folders => 
      this.addCardToQuiz(folders, quizId, newCard)
    );

    return newCard;
  }

  async updateCard(quizId: string, cardId: string, updates: Partial<QuizCard>): Promise<void> {
    this._folders.update(folders => 
      this.updateCardInQuiz(folders, quizId, cardId, updates)
    );
  }

  async deleteCard(quizId: string, cardId: string): Promise<void> {
    this._folders.update(folders => 
      this.removeCardFromQuiz(folders, quizId, cardId)
    );
  }

  // Study Session Management
  startStudySession(quiz: Quiz, settings?: Partial<StudySettings>): StudySession {
    const session: StudySession = {
      id: Date.now().toString(),
      quizId: quiz.id!,
      startTime: new Date(),
      correctAnswers: 0,
      totalAnswers: 0,
      cardsReviewed: [],
      settings: { ...quiz.studySettings, ...settings }
    };

    this._studySession.set(session);
    this._currentQuiz.set(quiz);
    return session;
  }

  updateStudySession(updates: Partial<StudySession>): void {
    this._studySession.update(session => 
      session ? { ...session, ...updates } : null
    );
  }

  endStudySession(): StudySession | null {
    const session = this._studySession();
    if (session) {
      this._studySession.update(s => s ? { ...s, endTime: new Date() } : null);
      // Save session to backend here
      this._studySession.set(null);
    }
    return session;
  }

  // Spaced Repetition Algorithm
  calculateNextReview(card: QuizCard, success: boolean): Date {
    const now = new Date();
    let interval = 1; // days

    if (success) {
      // Successful review - increase interval
      interval = Math.max(1, card.reviewCount * 2);
    } else {
      // Failed review - reset to short interval
      interval = 1;
    }

    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + interval);
    return nextReview;
  }

  getCardsNeedingReview(quiz: Quiz): QuizCard[] {
    const now = new Date();
    return quiz.cards.filter(card => 
      !card.nextReview || card.nextReview <= now
    );
  }

  // Statistics
  getStudyStats(quiz: Quiz): StudyStats {
    const totalCards = quiz.cards.length;
    const masteredCards = quiz.cards.filter(card => 
      card.successRate >= 0.8 && card.reviewCount >= 3
    ).length;
    const needsReview = this.getCardsNeedingReview(quiz).length;
    const averageSuccessRate = totalCards > 0 
      ? quiz.cards.reduce((sum, card) => sum + card.successRate, 0) / totalCards 
      : 0;

    return {
      totalCards,
      masteredCards,
      needsReview,
      averageSuccessRate,
      totalStudyTime: 0, // Calculate from study sessions
      streak: 0 // Calculate from study history
    };
  }

  // Search and Filter
  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  searchAllQuizzes(query: string): Quiz[] {
    const allQuizzes = this.allQuizzes();
    return allQuizzes.filter(quiz =>
      quiz.name.toLowerCase().includes(query.toLowerCase()) ||
      quiz.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );
  }

  // Navigation
  selectFolder(folder: QuizFolder | null): void {
    this._currentFolder.set(folder);
  }

  selectQuiz(quiz: Quiz | null): void {
    this._currentQuiz.set(quiz);
  }

  // Helper methods
  private addFolderToParent(folder: QuizFolder, parentId: string): void {
    this._folders.update(folders => 
      this.addFolderToParentRecursive(folders, folder, parentId)
    );
  }

  private addQuizToFolder(quiz: Quiz, folderId: string): void {
    this._folders.update(folders => 
      this.addQuizToFolderRecursive(folders, quiz, folderId)
    );
  }

  private updateFolderRecursive(folders: QuizFolder[], id: string, updates: Partial<QuizFolder>): QuizFolder[] {
    return folders.map(folder => {
      if (folder.id === id) {
        return { ...folder, ...updates, updated: new Date() };
      }
      return {
        ...folder,
        children: this.updateFolderRecursive(folder.children, id, updates)
      };
    });
  }

  private removeFolderRecursive(folders: QuizFolder[], id: string): QuizFolder[] {
    return folders.filter(folder => folder.id !== id).map(folder => ({
      ...folder,
      children: this.removeFolderRecursive(folder.children, id)
    }));
  }

  private updateQuizRecursive(folders: QuizFolder[], id: string, updates: Partial<Quiz>): QuizFolder[] {
    return folders.map(folder => ({
      ...folder,
      quizzes: folder.quizzes.map(quiz => 
        quiz.id === id ? { ...quiz, ...updates, updated: new Date() } : quiz
      ),
      children: this.updateQuizRecursive(folder.children, id, updates)
    }));
  }

  private removeQuizRecursive(folders: QuizFolder[], id: string): QuizFolder[] {
    return folders.map(folder => ({
      ...folder,
      quizzes: folder.quizzes.filter(quiz => quiz.id !== id),
      children: this.removeQuizRecursive(folder.children, id)
    }));
  }

  private addFolderToParentRecursive(folders: QuizFolder[], folder: QuizFolder, parentId: string): QuizFolder[] {
    return folders.map(f => {
      if (f.id === parentId) {
        return { ...f, children: [...f.children, folder] };
      }
      return {
        ...f,
        children: this.addFolderToParentRecursive(f.children, folder, parentId)
      };
    });
  }

  private addQuizToFolderRecursive(folders: QuizFolder[], quiz: Quiz, folderId: string): QuizFolder[] {
    return folders.map(folder => {
      if (folder.id === folderId) {
        return { ...folder, quizzes: [...folder.quizzes, quiz] };
      }
      return {
        ...folder,
        children: this.addQuizToFolderRecursive(folder.children, quiz, folderId)
      };
    });
  }

  private addCardToQuiz(folders: QuizFolder[], quizId: string, card: QuizCard): QuizFolder[] {
    return folders.map(folder => ({
      ...folder,
      quizzes: folder.quizzes.map(quiz => 
        quiz.id === quizId 
          ? { ...quiz, cards: [...quiz.cards, card], updated: new Date() }
          : quiz
      ),
      children: this.addCardToQuiz(folder.children, quizId, card)
    }));
  }

  private updateCardInQuiz(folders: QuizFolder[], quizId: string, cardId: string, updates: Partial<QuizCard>): QuizFolder[] {
    return folders.map(folder => ({
      ...folder,
      quizzes: folder.quizzes.map(quiz => 
        quiz.id === quizId 
          ? {
              ...quiz,
              cards: quiz.cards.map(card => 
                card.id === cardId 
                  ? { ...card, ...updates, updated: new Date() }
                  : card
              ),
              updated: new Date()
            }
          : quiz
      ),
      children: this.updateCardInQuiz(folder.children, quizId, cardId, updates)
    }));
  }

  private removeCardFromQuiz(folders: QuizFolder[], quizId: string, cardId: string): QuizFolder[] {
    return folders.map(folder => ({
      ...folder,
      quizzes: folder.quizzes.map(quiz => 
        quiz.id === quizId 
          ? { ...quiz, cards: quiz.cards.filter(card => card.id !== cardId), updated: new Date() }
          : quiz
      ),
      children: this.removeCardFromQuiz(folder.children, quizId, cardId)
    }));
  }
}
