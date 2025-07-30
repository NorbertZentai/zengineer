import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { QuizService, Quiz } from '../../core/services/quiz.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

interface QuizWithProfile extends Quiz {
  profiles?: {
    username?: string;
    email?: string;
  };
}

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './library.html',
  styleUrls: ['./library.scss']
})
export class LibraryPage implements OnInit {
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
    private translate: TranslateService
  ) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
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
        .from('quizzes')
        .select(`
          *,
          profiles!inner(username, email)
        `)
        .eq('is_public', true)
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

      const copiedQuiz = await this.quizService.createQuiz(newQuiz);
      if (copiedQuiz) {
        // ...existing code...
      }
    } catch (error) {
      console.error('Error copying quiz:', error);
    }
  }

  getQuizLanguageDisplay(quiz: QuizWithProfile): string {
    return quiz.language || '';
  }
}
