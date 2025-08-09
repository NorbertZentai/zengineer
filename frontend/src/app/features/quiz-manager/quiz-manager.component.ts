import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { QuizEditorComponent } from './quiz-editor/quiz-editor.component';
import { QuizStatsComponent } from './quiz-stats/quiz-stats.component';
import { QuizPreviewComponent } from './quiz-preview/quiz-preview.component';
import { QuizListComponent } from './quiz-list/quiz-list.component';
import { ViewChild } from '@angular/core';
import { QuizCreateModalComponent } from './quiz-create-modal/quiz-create-modal.component';
import { QuizImportModalComponent } from './quiz-import-modal/quiz-import-modal.component';
import { Quiz } from '../../core/services/quiz.service';
import { QuizService } from '../../core/services/quiz.service';
import { AiService } from '../../core/services/ai.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-quiz-manager',
  templateUrl: './quiz-manager.component.html',
  styleUrls: ['./quiz-manager.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    TranslateModule,
    QuizEditorComponent,
    QuizStatsComponent,
    QuizPreviewComponent,
    QuizListComponent,
    QuizCreateModalComponent,
    QuizImportModalComponent
  ]
})
export class QuizManagerComponent {
  showImportModal = false;

  onImport() {
    this.showImportModal = true;
  }

  handleImportModalClose() {
    this.showImportModal = false;
  }

  async handleQuizImported(event: any) {
    // Close modal and refresh the list so the new quiz/cards appear
    this.showImportModal = false;
    if (this.quizListComponent) {
      await this.quizListComponent.ngOnInitData();
    } else {
      await this.quizService.loadQuizzes();
    }
  this.notificationService.success('QUIZ_MANAGER.MESSAGES.QUIZ_IMPORTED', 'QUIZ_MANAGER.TITLE');
  }
  @ViewChild(QuizListComponent) quizListComponent?: QuizListComponent;
  selectedQuiz: any = null;
  viewMode: 'list' | 'edit' | 'stats' | 'preview' = 'list';
  showCreateModal = false;

  constructor(public quizService: QuizService, private ai: AiService, private notificationService: NotificationService) {}

  // Események kezelése
  onEdit(quiz: any) {
    this.selectedQuiz = quiz;
    this.viewMode = 'edit';
  }
  onDelete(quiz: any) {
    if (!quiz?.id) return;
    this.quizService.deleteQuiz(quiz.id)
      .then(async () => {
        // Sikeres törlés után frissítjük a listát
        if (this.quizListComponent) {
          await this.quizListComponent.ngOnInitData();
        }
        this.selectedQuiz = null;
        this.viewMode = 'list';
  this.notificationService.success('QUIZ_MANAGER.MESSAGES.QUIZ_DELETED', 'QUIZ_MANAGER.TITLE');
      })
      .catch((err: any) => {
        // Hibakezelés
  const msg = err?.message || '';
  const key = msg ? 'QUIZ_MANAGER.MESSAGES.DELETE_ERROR_WITH_DETAILS' : 'QUIZ_MANAGER.MESSAGES.DELETE_ERROR';
  this.notificationService.error(key, 'QUIZ_MANAGER.TITLE', msg ? { params: { details: msg } } : undefined);
      });
  }
  onStats(quiz: any) {
    this.selectedQuiz = quiz;
    this.viewMode = 'stats';
  }
  onPreview(quiz: any) {
    this.selectedQuiz = quiz;
    this.viewMode = 'preview';
  }
  onCreateNew() {
    this.showCreateModal = true;
  }
  onModalClose() {
    this.showCreateModal = false;
  }
  onQuizCreated(quiz: Quiz) {
    // Kvíz sikeresen létrehozva, frissítsük a listát
    this.showCreateModal = false;
    // A QuizService automatikusan frissíti a listát
  }
  onBack() {
    this.selectedQuiz = null;
    this.viewMode = 'list';
  }


}
