import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { QuizService, Quiz, QuizCard } from '../../core/services/quiz.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

interface QuizWithProfile extends Quiz {
  profiles?: {
    username?: string;
    email?: string;
  };
  card_count?: number;
}

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './library.html',
  styleUrls: ['./library.scss']
})
export class LibraryPage implements OnInit {
  hasCards(quiz: QuizWithProfile): boolean {
    return !!(quiz.id && this.quizCards[quiz.id] && this.quizCards[quiz.id].length > 0);
  }
  // ...existing code...
  quizCards: { [quizId: string]: QuizCard[] } = {};
  expandedQuizId: string | null = null;
  // Only keep the first constructor above, remove this duplicate
  openQuiz(quiz: QuizWithProfile) {
    if (quiz.id) {
      this.router.navigate(['/quiz-manager', quiz.id]);
    }
  }

  async toggleQuizCards(quiz: QuizWithProfile) {
    if (!quiz.id) return;
    if (this.expandedQuizId === quiz.id) {
      this.expandedQuizId = null;
      return;
    }
    this.expandedQuizId = quiz.id;
    if (!this.quizCards[quiz.id]) {
      try {
        const cards = await this.quizService.getQuizCards(quiz.id);
        this.quizCards[quiz.id] = cards;
      } catch (error) {
        console.error('Error loading quiz cards:', error);
      }
    }
  }
  private supabase: SupabaseClient;
  publicQuizzes: QuizWithProfile[] = [];
  filteredQuizzes: QuizWithProfile[] = [];
  searchTerm = '';
  selectedCategory = '';
  selectedLanguage = '';
  loading = true;
  error = '';
  
  categories: string[] = [];
  languages: string[] = [];

  constructor(
    private quizService: QuizService,
    private translate: TranslateService,
    private router: Router
  ) {
    // Use singleton SupabaseService
    this.supabase = (window as any).SupabaseService?.getClient?.() ?? undefined;
    if (!this.supabase) {
      // Fallback for direct import if not available on window
      try {
        // @ts-ignore
        const SupabaseService = require('../../core/services/supabase.service').SupabaseService;
        this.supabase = SupabaseService.getClient();
      } catch (e) {
        // If still not available, throw error
        throw new Error('SupabaseService singleton not found.');
      }
    }
  }

  async ngOnInit() {
    await this.loadPublicQuizzes();
    this.extractFilters();
    this.applyFilters();
    this.loading = false;
  }

  async loadPublicQuizzes() {
    try {
      const { data: quizzes, error } = await this.supabase
        .from('quiz_with_card_count')
        .select('*')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.publicQuizzes = quizzes || [];
    } catch (error) {
      console.error('Error loading public quizzes:', error);
      this.error = this.translate.instant('LIBRARY.LOAD_ERROR');
    }
  }

  extractFilters() {
    // Extract unique subjects and languages
    const subjectSet = new Set<string>();
    const languageSet = new Set<string>();

    this.publicQuizzes.forEach(quiz => {
      if (quiz.subject) subjectSet.add(quiz.subject);
      if (quiz.language) languageSet.add(quiz.language);
    });

    this.categories = Array.from(subjectSet).sort();
    this.languages = Array.from(languageSet).sort();
  }

  applyFilters() {
    this.filteredQuizzes = this.publicQuizzes.filter(quiz => {
      const matchesSearch = !this.searchTerm || 
        quiz.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        quiz.description?.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesCategory = !this.selectedCategory || quiz.subject === this.selectedCategory;
      
      const matchesLanguage = !this.selectedLanguage || quiz.language === this.selectedLanguage;

      return matchesSearch && matchesCategory && matchesLanguage;
    });
  }

  onSearchChange() {
    this.applyFilters();
  }

  onCategoryChange() {
    this.applyFilters();
  }

  onLanguageChange() {
    this.applyFilters();
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.selectedLanguage = '';
    this.applyFilters();
  }

  async copyQuizToMyLibrary(quiz: QuizWithProfile) {
    try {
      // Create a copy of the quiz for the current user
      const newQuiz = { ...quiz };
      delete newQuiz.id;
      delete newQuiz.created_at;
      delete newQuiz.updated_at;
      newQuiz.visibility = 'private';
      newQuiz.name = `${quiz.name} (Copy)`;
      // A másolt kvíz tulajdonosa a bejelentkezett felhasználó
      newQuiz.user_id = this.quizService.user()?.id;

      const copiedQuiz = await this.quizService.createQuiz(newQuiz);
      if (copiedQuiz && quiz.id) {
        // Lekérjük az eredeti kvíz kártyáit
        const cards = await this.quizService.getQuizCards(quiz.id);
        // Lemásoljuk az összes kártyát az új kvízhez
        for (const card of cards) {
          // answer: flashcard -> string, multiple_choice -> JSON string
          let answerValue = card.answer;
          // Ha az eredeti answer mező nem üres, pontosan másoljuk
          if (typeof answerValue === 'string' && answerValue !== '') {
            // do nothing, keep as is
          } else if (card.card_type === 'multiple_choice') {
            // Ha üres, generálunk JSON-t
            answerValue = JSON.stringify({
              type: 'multiple_choice',
              correct: (() => {
                try {
                  if (typeof card.answer === 'string') {
                    const parsed = JSON.parse(card.answer);
                    return parsed.correct || [];
                  }
                  return [];
                } catch {
                  return [];
                }
              })(),
              incorrect: (() => {
                try {
                  if (typeof card.answer === 'string') {
                    const parsed = JSON.parse(card.answer);
                    return parsed.incorrect || [];
                  }
                  return [];
                } catch {
                  return [];
                }
              })(),
              hint: card.hint
            });
          } else {
            // Flashcard: üres string
            answerValue = '';
          }
          // tags must be JSON string
          let tagsValue = Array.isArray(card.tags) ? JSON.stringify(card.tags) : (card.tags ?? '[]');
          await this.quizService.createCard({
            quiz_id: copiedQuiz.id,
            question: card.question,
            answer: answerValue,
            tags: card.tags,
            difficulty: card.difficulty,
            card_type: card.card_type || (typeof answerValue === 'string' && answerValue.startsWith('{') ? 'multiple_choice' : 'flashcard')
          });
        }
        // Frissítjük a quiz listát, hogy azonnal látszódjon az új kvíz
        await this.quizService.loadQuizzes();
        // Navigálunk az új kvíz szerkesztő oldalára
        this.router.navigate(['/quiz-manager', copiedQuiz.id]);
      }
    } catch (error) {
      console.error('Error copying quiz:', error);
    }
  }

  getQuizLanguageDisplay(quiz: QuizWithProfile): string {
    return quiz.language || '';
  }
}
