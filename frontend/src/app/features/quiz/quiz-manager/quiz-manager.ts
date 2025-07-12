import { Component, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { QuizService, Quiz, QuizFolder, QuizCard, StudySession } from '../../../core/services/quiz.service';
import { QuizCardEditorComponent } from '../quiz-card-editor/quiz-card-editor';
import { StudyModeComponent } from '../study-mode/study-mode';
import { QuizStatsComponent } from '../quiz-stats/quiz-stats';
import { safeArray, safeAccess } from '../../../shared/utils/safe-access';

export type ViewMode = 'grid' | 'list' | 'study';
export type SortBy = 'name' | 'created' | 'updated' | 'cards';

@Component({
  standalone: true,
  selector: 'app-quiz-manager',
  templateUrl: './quiz-manager.html',
  styleUrls: ['./quiz-manager.scss'],
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule,
    MatIconModule, 
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatChipsModule,
    MatProgressBarModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
    MatDialogModule,
    MatSnackBarModule,
    TranslateModule
  ],
})
export class QuizManager {
  // State management with signals
  private _viewMode = signal<ViewMode>('grid');
  private _sortBy = signal<SortBy>('name');
  private _sortAscending = signal(true);
  private _selectedTags = signal<string[]>([]);
  
  // UI state
  showCreateDialog = signal(false);
  createType = signal<'folder' | 'quiz'>('folder');
  createName = signal('');
  createDescription = signal('');
  selectedColor = signal('#1976d2');
  selectedIcon = signal('folder');
  
  // Breadcrumb navigation
  breadcrumb = computed(() => {
    const current = this.quizService.currentFolder();
    const path: QuizFolder[] = [];
    
    if (current) {
      // Build full breadcrumb path from root to current
      let currentNode: QuizFolder | null = current;
      const reversePath: QuizFolder[] = [];
      
      // Traverse up to root
      while (currentNode) {
        reversePath.push(currentNode);
        if (currentNode.parent_id) {
          const folders = this.quizService.folders();
          currentNode = this.findFolderById(folders, currentNode.parent_id);
        } else {
          currentNode = null;
        }
      }
      
      // Reverse to get root-to-current order
      path.push(...reversePath.reverse());
    }
    
    return path;
  });

  // Filtered and sorted content
  displayedQuizzes = computed(() => {
    let quizzes = this.quizService.filteredQuizzes();
    
    // Filter by tags
    const selectedTags = this._selectedTags();
    if (selectedTags.length > 0) {
      quizzes = quizzes.filter((quiz: Quiz) => 
        selectedTags.some(tag => safeArray(quiz.tags).includes(tag))
      );
    }
    
    // Sort
    const sortBy = this._sortBy();
    const ascending = this._sortAscending();
    
    quizzes.sort((a: Quiz, b: Quiz) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created':
          comparison = (a.created?.getTime() || 0) - (b.created?.getTime() || 0);
          break;
        case 'updated':
          comparison = (a.updated?.getTime() || 0) - (b.updated?.getTime() || 0);
          break;
        case 'cards':
          comparison = safeArray(a.cards).length - safeArray(b.cards).length;
          break;
      }
      return ascending ? comparison : -comparison;
    });
    
    return quizzes;
  });

  // All available tags
  availableTags = computed(() => {
    const allTags = new Set<string>();
    this.quizService.allQuizzes().forEach((quiz: Quiz) => {
      safeArray(quiz.tags).forEach((tag: string) => allTags.add(tag));
    });
    return Array.from(allTags).sort();
  });

  // Statistics
  folderStats = computed(() => {
    const folder = this.quizService.currentFolder();
    if (!folder) return null;
    
    const totalQuizzes = safeArray(folder.quizzes).length;
    const totalCards = safeArray(folder.quizzes).reduce((sum: number, quiz: Quiz) => sum + safeArray(quiz.cards).length, 0);
    const needsReview = safeArray(folder.quizzes).reduce((sum: number, quiz: Quiz) => 
      sum + this.quizService.getCardsNeedingReview(quiz).length, 0
    );
    
    return { totalQuizzes, totalCards, needsReview };
  });

  // Icon options
  iconOptions = [
    'folder', 'quiz', 'book', 'school', 'code', 'science', 'language',
    'history', 'psychology', 'calculate', 'architecture', 'palette',
    'music_note', 'sports', 'restaurant', 'flight', 'directions_car'
  ];

  // Color options
  colorOptions = [
    '#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2',
    '#0097a7', '#5d4037', '#616161', '#e91e63', '#ff5722'
  ];

  constructor(
    public quizService: QuizService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {
    // Load initial data
    effect(() => {
      if (this.quizService.isLoading()) {
        // Loading state - could show spinner
      }
    });
  }

  // Public getters for template
  get viewMode() { return this._viewMode; }
  get sortBy() { return this._sortBy; }
  get sortAscending() { return this._sortAscending; }
  get selectedTags() { return this._selectedTags; }
  // Navigation methods
  navigateToFolder(folder: QuizFolder | null): void {
    this.quizService.selectFolder(folder);
  }

  navigateToQuiz(quiz: Quiz): void {
    this.quizService.selectQuiz(quiz);
  }

  goBack(): void {
    const currentFolder = this.quizService.currentFolder();
    if (currentFolder?.parent_id) {
      // Navigate to parent folder
      const folders = this.quizService.folders();
      const parent = this.findFolderById(folders, currentFolder.parent_id);
      this.navigateToFolder(parent);
    } else {
      this.navigateToFolder(null);
    }
  }

  // View mode controls
  setViewMode(mode: ViewMode): void {
    this._viewMode.set(mode);
  }

  setSortBy(sortBy: SortBy): void {
    if (this._sortBy() === sortBy) {
      this._sortAscending.update(asc => !asc);
    } else {
      this._sortBy.set(sortBy);
      this._sortAscending.set(true);
    }
  }

  // Tag filtering
  toggleTag(tag: string): void {
    this._selectedTags.update(tags => {
      const index = tags.indexOf(tag);
      if (index >= 0) {
        return tags.filter(t => t !== tag);
      } else {
        return [...tags, tag];
      }
    });
  }

  clearTagFilter(): void {
    this._selectedTags.set([]);
  }

  // Search
  onSearch(query: string): void {
    this.quizService.setSearchQuery(query);
  }

  // Create operations
  showCreateFolderDialog(): void {
    this.createType.set('folder');
    this.showCreateDialog.set(true);
    this.resetCreateForm();
  }

  showCreateQuizDialog(): void {
    this.createType.set('quiz');
    this.showCreateDialog.set(true);
    this.resetCreateForm();
  }

  async confirmCreate(): Promise<void> {
    const name = this.createName().trim();
    if (!name) return;

    try {
      const currentFolder = this.quizService.currentFolder();
      
      if (this.createType() === 'folder') {
        await this.quizService.createFolder({
          name,
          parent_id: currentFolder?.id
        });
        this.snackBar.open(
          this.translate.instant('QUIZ_MANAGER.MESSAGES.FOLDER_CREATED'), 
          this.translate.instant('QUIZ_MANAGER.CREATE_DIALOG.CLOSE'), 
          { duration: 3000 }
        );
      } else {
        const quiz = await this.quizService.createQuiz({
          name,
          folder_id: currentFolder?.id
        });
        
        // Update quiz with additional properties
        await this.quizService.updateQuiz(quiz.id!, {
          description: this.createDescription(),
          color: this.selectedColor(),
          icon: this.selectedIcon()
        });
        
        this.snackBar.open(
          this.translate.instant('QUIZ_MANAGER.MESSAGES.QUIZ_CREATED'), 
          this.translate.instant('QUIZ_MANAGER.CREATE_DIALOG.CLOSE'), 
          { duration: 3000 }
        );
      }
      
      this.cancelCreate();
    } catch (error) {
      console.error('Error creating item:', error);
      this.snackBar.open(
        this.translate.instant('QUIZ_MANAGER.MESSAGES.CREATE_ERROR'), 
        this.translate.instant('QUIZ_MANAGER.CREATE_DIALOG.CLOSE'), 
        { duration: 3000 }
      );
    }
  }

  cancelCreate(): void {
    this.showCreateDialog.set(false);
    this.resetCreateForm();
  }

  private resetCreateForm(): void {
    this.createName.set('');
    this.createDescription.set('');
    this.selectedColor.set('#1976d2');
    this.selectedIcon.set(this.createType() === 'folder' ? 'folder' : 'quiz');
  }

  // Edit operations
  async updateFolder(folder: QuizFolder, updates: Partial<QuizFolder>): Promise<void> {
    try {
      await this.quizService.updateFolder(folder.id!, updates);
      this.snackBar.open(
        this.translate.instant('QUIZ_MANAGER.MESSAGES.FOLDER_UPDATED'), 
        this.translate.instant('QUIZ_MANAGER.CREATE_DIALOG.CLOSE'), 
        { duration: 2000 }
      );
    } catch (error) {
      console.error('Error updating folder:', error);
      this.snackBar.open(
        this.translate.instant('QUIZ_MANAGER.MESSAGES.UPDATE_ERROR'), 
        this.translate.instant('QUIZ_MANAGER.CREATE_DIALOG.CLOSE'), 
        { duration: 3000 }
      );
    }
  }

  async updateQuiz(quiz: Quiz, updates: Partial<Quiz>): Promise<void> {
    try {
      await this.quizService.updateQuiz(quiz.id!, updates);
      this.snackBar.open(
        this.translate.instant('QUIZ_MANAGER.MESSAGES.QUIZ_UPDATED'), 
        this.translate.instant('QUIZ_MANAGER.CREATE_DIALOG.CLOSE'), 
        { duration: 2000 }
      );
    } catch (error) {
      console.error('Error updating quiz:', error);
      this.snackBar.open(
        this.translate.instant('QUIZ_MANAGER.MESSAGES.UPDATE_ERROR'), 
        this.translate.instant('QUIZ_MANAGER.CREATE_DIALOG.CLOSE'), 
        { duration: 3000 }
      );
    }
  }

  // Delete operations
  async deleteFolder(folder: QuizFolder): Promise<void> {
    const confirmMessage = `${this.translate.instant('QUIZ_MANAGER.CONFIRM.DELETE_FOLDER')} "${folder.name}" ${this.translate.instant('QUIZ_MANAGER.CONFIRM.DELETE_FOLDER_WARNING')}`;
    if (confirm(confirmMessage)) {
      try {
        await this.quizService.deleteFolder(folder.id!);
        this.snackBar.open(
          this.translate.instant('QUIZ_MANAGER.MESSAGES.FOLDER_DELETED'), 
          this.translate.instant('QUIZ_MANAGER.CREATE_DIALOG.CLOSE'), 
          { duration: 2000 }
        );
      } catch (error) {
        console.error('Error deleting folder:', error);
        this.snackBar.open(
          this.translate.instant('QUIZ_MANAGER.MESSAGES.DELETE_ERROR'), 
          this.translate.instant('QUIZ_MANAGER.CREATE_DIALOG.CLOSE'), 
          { duration: 3000 }
        );
      }
    }
  }

  async deleteQuiz(quiz: Quiz): Promise<void> {
    const confirmMessage = `${this.translate.instant('QUIZ_MANAGER.CONFIRM.DELETE_QUIZ')} "${quiz.name}" ${this.translate.instant('QUIZ_MANAGER.CONFIRM.DELETE_QUIZ_WARNING')}`;
    if (confirm(confirmMessage)) {
      try {
        await this.quizService.deleteQuiz(quiz.id!);
        this.snackBar.open(
          this.translate.instant('QUIZ_MANAGER.MESSAGES.QUIZ_DELETED'), 
          this.translate.instant('QUIZ_MANAGER.CREATE_DIALOG.CLOSE'), 
          { duration: 2000 }
        );
      } catch (error) {
        console.error('Error deleting quiz:', error);
        this.snackBar.open(
          this.translate.instant('QUIZ_MANAGER.MESSAGES.DELETE_ERROR'), 
          this.translate.instant('QUIZ_MANAGER.CREATE_DIALOG.CLOSE'), 
          { duration: 3000 }
        );
      }
    }
  }

  // Card operations
  openCardEditor(quiz: Quiz): void {
    const dialogRef = this.dialog.open(QuizCardEditorComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: { quiz }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Cards were updated, refresh might be needed
      }
    });
  }

  // Study mode
  startStudyMode(quiz: Quiz): void {
    if (safeArray(quiz.cards).length === 0) {
      this.snackBar.open(
        this.translate.instant('QUIZ_MANAGER.MESSAGES.NO_CARDS'), 
        this.translate.instant('QUIZ_MANAGER.CREATE_DIALOG.CLOSE'), 
        { duration: 3000 }
      );
      return;
    }

    const dialogRef = this.dialog.open(StudyModeComponent, {
      width: '100%',
      height: '100%',
      maxWidth: '100vw',
      maxHeight: '100vh',
      panelClass: 'fullscreen-dialog',
      data: { quiz }
    });

    dialogRef.afterClosed().subscribe((result: StudySession | null) => {
      if (result) {
        this.snackBar.open(
          `${this.translate.instant('QUIZ_MANAGER.MESSAGES.STUDY_COMPLETE')} ${result.correctAnswers}/${result.totalAnswers} ${this.translate.instant('QUIZ_MANAGER.MESSAGES.CORRECT_ANSWERS')}`,
          this.translate.instant('QUIZ_MANAGER.CREATE_DIALOG.CLOSE'),
          { duration: 5000 }
        );
      }
    });
  }

  // Statistics
  showQuizStats(quiz: Quiz): void {
    this.dialog.open(QuizStatsComponent, {
      width: '600px',
      data: { quiz }
    });
  }

  // Utility methods
  private findFolderById(folders: QuizFolder[], id: string): QuizFolder | null {
    for (const folder of folders) {
      if (folder.id === id) return folder;
      const found = this.findFolderById(safeArray(folder.children), id);
      if (found) return found;
    }
    return null;
  }

  trackByQuizId(index: number, quiz: Quiz): string {
    return quiz.id || index.toString();
  }

  trackByFolderId(index: number, folder: QuizFolder): string {
    return folder.id || index.toString();
  }

  // Export/Import functionality
  async exportQuiz(quiz: Quiz): Promise<void> {
    try {
      const data = JSON.stringify(quiz, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quiz.name}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      this.snackBar.open(
        this.translate.instant('QUIZ_MANAGER.MESSAGES.QUIZ_EXPORTED'), 
        this.translate.instant('QUIZ_MANAGER.CREATE_DIALOG.CLOSE'), 
        { duration: 2000 }
      );
    } catch (error) {
      console.error('Error exporting quiz:', error);
      this.snackBar.open(
        this.translate.instant('QUIZ_MANAGER.MESSAGES.EXPORT_ERROR'), 
        this.translate.instant('QUIZ_MANAGER.CREATE_DIALOG.CLOSE'), 
        { duration: 3000 }
      );
    }
  }

  // Drag & Drop functionality (placeholder)
  onDragStart(event: DragEvent, item: Quiz | QuizFolder): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', JSON.stringify({
        id: item.id,
        type: 'quizzes' in item ? 'folder' : 'quiz'
      }));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent, targetFolder: QuizFolder): void {
    event.preventDefault();
    try {
      const data = JSON.parse(event.dataTransfer?.getData('text/plain') || '');
      
      // TODO: Implement actual move logic
      if (data.type === 'quiz') {
        // Move quiz to target folder
        // await this.quizService.moveQuiz(data.id, targetFolder.id);
      } else if (data.type === 'folder') {
        // Move folder to target folder
        // await this.quizService.moveFolder(data.id, targetFolder.id);
      }
      
      // For now, just show a message
      this.snackBar.open(
        `${this.translate.instant('QUIZ_MANAGER.MESSAGES.MOVE_NOT_IMPLEMENTED')}`,
        this.translate.instant('QUIZ_MANAGER.CREATE_DIALOG.CLOSE'),
        { duration: 3000 }
      );
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  }
}
