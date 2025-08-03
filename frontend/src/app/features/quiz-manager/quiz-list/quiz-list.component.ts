import { Component, Output, EventEmitter, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { QuizService, Quiz } from '../../../core/services/quiz.service';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-quiz-list',
  templateUrl: './quiz-list.component.html',
  styleUrls: ['./quiz-list.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterModule, TranslateModule]
})
export class QuizListComponent implements OnInit {
  showScrollTop = false;
  private scrollListener: (() => void) | null = null;

  // ...existing code...

  async ngOnInit() {
    this.scrollListener = () => {
      this.showScrollTop = window.scrollY > 400;
    };
    window.addEventListener('scroll', this.scrollListener as EventListener);
    await this.ngOnInitData();
  }

  ngOnDestroy(): void {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener as EventListener);
    }
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  quizzes: Quiz[] = [];
  searchTerm: string = '';
  sortBy: 'name' | 'date' | 'status' = 'name';
  isLoading: boolean = false;
  error: string | null = null;
  activeMenuId: string | null = null;

  logQuiz(quiz: Quiz) {
    console.log('[QUIZ LIST HTML] Rendered copied quiz:', quiz);
  }
  @Output() edit = new EventEmitter<any>();
  @Output() delete = new EventEmitter<any>();
  @Output() stats = new EventEmitter<any>();
  @Output() preview = new EventEmitter<any>();
  @Output() createNew = new EventEmitter<void>();

  constructor(
    private quizService: QuizService,
    private authService: AuthService,
    private router: Router
  ) {}

  async ngOnInitData() {
    this.isLoading = true;
    this.error = null;
    try {
      // Várjuk meg hogy az auth service inicializálódjon
      await this.authService.waitForInit();
      // Ellenőrizzük hogy be van-e jelentkezve a felhasználó
      if (!this.authService.isAuthenticated()) {
        this.error = 'Nincs bejelentkezett felhasználó. Jelentkezz be!';
        this.isLoading = false;
        return;
      }
      // Betöltjük a kvízeket
      await this.quizService.loadQuizzes();
      this.quizzes = this.quizService.quizzes();
      this.isLoading = false;
    } catch (err: any) {
      this.error = err?.message || 'Hiba történt a kvízek betöltésekor.';
      this.isLoading = false;
    }
  }

  get filteredQuizzes() {
    let list = this.quizzes.filter(q =>
      q.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
    // TODO: szűrés, rendezés
    return list;
  }

  onEdit(quiz: any) {
    this.edit.emit(quiz);
  }
  onDelete(quiz: any) {
    this.delete.emit(quiz);
  }
  onStats(quiz: any) {
    this.stats.emit(quiz);
  }
  onPreview(quiz: any) {
    this.preview.emit(quiz);
  }
  onCreateNew() {
    this.createNew.emit();
  }

  onQuizClick(quiz: Quiz) {
    // Ne navigáljunk, ha a menü nyitva van vagy ha egy gombra kattintottunk
    if (this.activeMenuId === quiz.id) {
      return;
    }
    if (quiz.name?.includes('(Copy)')) {
      console.log('[QUIZ LIST] Navigating to copied quiz:', quiz);
    }
    this.router.navigate(['/quiz-manager', quiz.id]);
  }

  toggleMenu(quizId: string | undefined, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (!quizId) return;
    this.activeMenuId = this.activeMenuId === quizId ? null : quizId;
  }

  closeMenu() {
    this.activeMenuId = null;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    // Bezárja a menüt, ha a kártyán kívülre kattintunk
    const target = event.target as HTMLElement;
    if (!target.closest('.quiz-actions-menu')) {
      this.closeMenu();
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Ma';
    } else if (diffDays === 1) {
      return 'Tegnap';
    } else if (diffDays < 7) {
      return `${diffDays} napja`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? '1 hete' : `${weeks} hete`;
    } else {
      return date.toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  }
}
