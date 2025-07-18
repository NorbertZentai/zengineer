import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { QuizEditorComponent } from './quiz-editor/quiz-editor.component';
import { QuizStatsComponent } from './quiz-stats/quiz-stats.component';
import { QuizPreviewComponent } from './quiz-preview/quiz-preview.component';
import { QuizListComponent } from './quiz-list/quiz-list.component';
import { QuizCreateModalComponent } from './quiz-create-modal/quiz-create-modal.component';
import { Quiz } from '../../core/services/quiz.service';

@Component({
  selector: 'app-quiz-manager',
  templateUrl: './quiz-manager.component.html',
  styleUrls: ['./quiz-manager.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    QuizEditorComponent,
    QuizStatsComponent,
    QuizPreviewComponent,
    QuizListComponent,
    QuizCreateModalComponent
  ]
})
export class QuizManagerComponent {
  selectedQuiz: any = null;
  viewMode: 'list' | 'edit' | 'stats' | 'preview' = 'list';
  showCreateModal = false;

  // Események kezelése
  onEdit(quiz: any) {
    this.selectedQuiz = quiz;
    this.viewMode = 'edit';
  }
  onDelete(quiz: any) {
    // TODO: API hívás törléshez
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
