import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Quiz, QuizFolder } from '../../../../../core/services/quiz.service';

export type ViewMode = 'grid' | 'list';

@Component({
  standalone: true,
  selector: 'app-quiz-list',
  templateUrl: './quiz-list.html',
  styleUrls: ['./quiz-list-simple.scss'],
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatMenuModule,
    MatChipsModule,
    MatTooltipModule
  ]
})
export class QuizListComponent {
  @Input() quizzes: Quiz[] = [];
  @Input() folders: QuizFolder[] = [];
  @Input() viewMode: ViewMode = 'grid';
  @Input() loading = false;

  @Output() quizSelect = new EventEmitter<Quiz>();
  @Output() quizEdit = new EventEmitter<Quiz>();
  @Output() quizDelete = new EventEmitter<Quiz>();
  @Output() quizExport = new EventEmitter<Quiz>();
  @Output() folderSelect = new EventEmitter<QuizFolder>();
  @Output() folderEdit = new EventEmitter<QuizFolder>();
  @Output() folderDelete = new EventEmitter<QuizFolder>();

  onQuizSelect(quiz: Quiz): void {
    this.quizSelect.emit(quiz);
  }

  onQuizEdit(quiz: Quiz): void {
    this.quizEdit.emit(quiz);
  }

  onQuizDelete(quiz: Quiz): void {
    this.quizDelete.emit(quiz);
  }

  onQuizExport(quiz: Quiz): void {
    this.quizExport.emit(quiz);
  }

  onFolderSelect(folder: QuizFolder): void {
    this.folderSelect.emit(folder);
  }

  onFolderEdit(folder: QuizFolder): void {
    this.folderEdit.emit(folder);
  }

  onFolderDelete(folder: QuizFolder): void {
    this.folderDelete.emit(folder);
  }

  getDifficultyColor(level: number): string {
    switch (level) {
      case 1:
      case 2:
        return '#4caf50';
      case 3:
        return '#ff9800';
      case 4:
      case 5:
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  }

  getDifficultyLabel(level: number): string {
    switch (level) {
      case 1:
        return 'Nagyon könnyű';
      case 2:
        return 'Könnyű';
      case 3:
        return 'Közepes';
      case 4:
        return 'Nehéz';
      case 5:
        return 'Nagyon nehéz';
      default:
        return 'Ismeretlen';
    }
  }

  trackByQuizId(index: number, quiz: Quiz): string {
    return quiz.id || index.toString();
  }

  trackByFolderId(index: number, folder: QuizFolder): string {
    return folder.id || index.toString();
  }
}
