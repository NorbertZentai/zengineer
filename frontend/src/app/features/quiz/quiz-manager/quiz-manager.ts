import { Component, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule, MatButtonToggleChange } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { QuizService, Quiz, QuizFolder, QuizCard, StudySession, Project } from '../../../core/services/quiz.service';
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
  styleUrls: ['./quiz-manager-simple.scss'],
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule,
    TranslateModule,
    MatIconModule,
    MatCardModule,
    MatMenuModule,
    MatDividerModule,
    MatChipsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
})
export class QuizManager {
  // State management with signals
  private _viewMode = signal<ViewMode>('grid');
  private _sortBy = signal<SortBy>('name');
  private _sortAscending = signal(true);
  private _selectedTags = signal<string[]>([]);
  private _isDarkTheme = signal(false);
  
  // UI state
  showCreateDialog = signal(false);
  createType = signal<'folder' | 'quiz'>('folder');
  createName = signal('');
  createDescription = signal('');
  selectedColor = signal('#1976d2');
  selectedIcon = signal('folder');
  
  // Breadcrumb navigation
  breadcrumb = computed(() => {
    const currentProject = this.quizService.currentProject();
    const currentFolder = this.quizService.currentFolder();
    const path: (Project | QuizFolder)[] = [];
    
    // Add project to path
    if (currentProject) {
      path.push(currentProject);
    }
    
    // Add current folder if exists
    if (currentFolder) {
      path.push(currentFolder);
    }
    
    return path;
  });

  // Filtered and sorted content
  displayedQuizzes = computed(() => {
    let quizzes = this.quizService.filteredQuizzes();
    
    // Filter by tags
    const selectedTags = this._selectedTags();
    if (selectedTags.length > 0) {
      quizzes = quizzes.filter((quiz: Quiz) => {
        const quizTags = this.getQuizTags(quiz);
        return selectedTags.some(tag => quizTags.includes(tag));
      });
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
          comparison = (new Date(a.created_at || 0).getTime()) - (new Date(b.created_at || 0).getTime());
          break;
        case 'updated':
          comparison = (new Date(a.updated_at || 0).getTime()) - (new Date(b.updated_at || 0).getTime());
          break;
        case 'cards':
          comparison = safeArray(a.cards).length - safeArray(b.cards).length;
          break;
      }
      return ascending ? comparison : -comparison;
    });
    
    return quizzes;
  });

  displayedFolders = computed(() => {
    const currentProject = this.quizService.currentProject();
    const allFolders = this.quizService.folders();
    
    console.log('displayedFolders computed - currentProject:', currentProject);
    console.log('displayedFolders computed - allFolders:', allFolders);
    
    // Get folders that belong to the current project
    const projectFolders = allFolders.filter((folder: QuizFolder) => {
      return currentProject ? folder.project_id === currentProject.id : false;
    });
    
    console.log('projectFolders:', projectFolders);
    
    // Apply search filter if active
    const searchQuery = this.quizService.searchQuery().toLowerCase();
    let filteredFolders = projectFolders;
    
    if (searchQuery) {
      filteredFolders = projectFolders.filter((folder: QuizFolder) => 
        folder.name.toLowerCase().includes(searchQuery)
      );
    }
    
    // Sort by name
    const sortBy = this._sortBy();
    const ascending = this._sortAscending();
    
    filteredFolders.sort((a: QuizFolder, b: QuizFolder) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created':
          comparison = (new Date(a.created_at || 0).getTime()) - (new Date(b.created_at || 0).getTime());
          break;
        case 'updated':
          comparison = (new Date(a.updated_at || 0).getTime()) - (new Date(b.updated_at || 0).getTime());
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }
      return ascending ? comparison : -comparison;
    });
    
    return filteredFolders;
  });

  // All available tags
  availableTags = computed(() => {
    const allTags = new Set<string>();
    this.quizService.allQuizzes().forEach((quiz: Quiz) => {
      this.getQuizTags(quiz).forEach((tag: string) => allTags.add(tag));
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

  // Sort options  
  sortOptions: SortBy[] = ['name', 'created', 'updated', 'cards'];

  // Color options
  colorOptions = [
    '#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2',
    '#0097a7', '#5d4037', '#616161', '#e91e63', '#ff5722'
  ];

  constructor(
    public quizService: QuizService,
    private translate: TranslateService
  ) {
    // Load initial data
    effect(() => {
      if (this.quizService.isLoading()) {
        // Loading state - could show spinner
      }
    });
    
    // Initialize theme
    this.loadThemePreference();
  }

  // Public getters for template
  get viewMode() { return this._viewMode; }
  get sortBy() { return this._sortBy; }
  get sortAscending() { return this._sortAscending; }
  get selectedTags() { return this._selectedTags; }
  get isDarkTheme() { return this._isDarkTheme; }

  // Theme management methods
  private loadThemePreference(): void {
    const savedTheme = localStorage.getItem('quiz-manager-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    
    this._isDarkTheme.set(isDark);
    this.applyTheme(isDark);
  }

  toggleTheme(): void {
    const newTheme = !this._isDarkTheme();
    this._isDarkTheme.set(newTheme);
    this.applyTheme(newTheme);
    localStorage.setItem('quiz-manager-theme', newTheme ? 'dark' : 'light');
  }

  private applyTheme(isDark: boolean): void {
    const body = document.body;
    if (isDark) {
      body.setAttribute('data-theme', 'dark');
    } else {
      body.removeAttribute('data-theme');
    }
  }

  // Navigation methods
  navigateToFolder(folder: QuizFolder | null): void {
    this.quizService.selectFolder(folder);
  }

  navigateToQuiz(quiz: Quiz): void {
    this.quizService.selectQuiz(quiz);
  }

  goBack(): void {
    const currentFolder = this.quizService.currentFolder();
    if (currentFolder) {
      // Ha van folder, menjünk vissza a projekthez
      this.navigateToFolder(null);
    } else {
      // Ha nincs folder, menjünk vissza a projekt választáshoz
      this.quizService.selectProject(null);
    }
  }

  // View mode controls
  setViewMode(mode: ViewMode): void;
  setViewMode(event: MatButtonToggleChange): void;
  setViewMode(modeOrEvent: ViewMode | MatButtonToggleChange): void {
    const mode = typeof modeOrEvent === 'string' ? modeOrEvent : modeOrEvent.value as ViewMode;
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

  showCreateProjectDialog(): void {
    // TODO: Implement project creation dialog
    console.log('Projekt létrehozás még nem implementált');
  }

  async confirmCreate(): Promise<void> {
    const name = this.createName().trim();
    if (!name) return;

    try {
      const currentFolder = this.quizService.currentFolder();
      
      if (this.createType() === 'folder') {
        await this.quizService.createFolder({
          name,
          description: this.createDescription(),
          color: this.selectedColor(),
          visibility: 'private',
          tags: [],
          order_index: 0,
          project_id: this.quizService.currentProject()?.id || ''
        });
        // TODO: Show notification: Folder created successfully
      } else {
        const quiz = await this.quizService.createQuiz({
          name,
          color: this.selectedColor(),
          visibility: 'private',
          tags: [],
          difficulty_level: 1,
          estimated_time: 10,
          study_modes: ['flashcard'],
          language: 'hu',
          project_id: this.quizService.currentProject()?.id,
          folder_id: currentFolder?.id
        });
        
        // Update quiz with additional properties
        await this.quizService.updateQuiz(quiz.id!, {
          description: this.createDescription(),
          color: this.selectedColor()
        });
        
        console.log('Quiz created successfully');
      }
      
      this.cancelCreate();
    } catch (error) {
      console.error('Error creating item:', error);
      console.log('Error creating item');
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
      console.log('Folder updated successfully');
    } catch (error) {
      console.error('Error updating folder:', error);
      console.log('Error updating folder');
    }
  }

  async updateQuiz(quiz: Quiz, updates: Partial<Quiz>): Promise<void> {
    try {
      await this.quizService.updateQuiz(quiz.id!, updates);
      console.log('Quiz updated successfully');
    } catch (error) {
      console.error('Error updating quiz:', error);
      console.log('Error updating quiz');
    }
  }

  // Folder edit operations
  editFolder(folder: QuizFolder): void {
    this.createType.set('folder');
    this.createName.set(folder.name);
    this.selectedColor.set(folder.color || '#2196f3');
    this.selectedIcon.set('folder'); // Fix ikon
    this.showCreateDialog.set(true);
  }

  // Delete operations
  async deleteFolder(folder: QuizFolder): Promise<void> {
    const confirmMessage = `${this.translate.instant('QUIZ_MANAGER.CONFIRM.DELETE_FOLDER')} "${folder.name}" ${this.translate.instant('QUIZ_MANAGER.CONFIRM.DELETE_FOLDER_WARNING')}`;
    if (confirm(confirmMessage)) {
      try {
        await this.quizService.deleteFolder(folder.id!);
        console.log('Folder deleted successfully');
      } catch (error) {
        console.error('Error deleting folder:', error);
        console.log('Error deleting folder');
      }
    }
  }

  async deleteQuiz(quiz: Quiz): Promise<void> {
    const confirmMessage = `${this.translate.instant('QUIZ_MANAGER.CONFIRM.DELETE_QUIZ')} "${quiz.name}" ${this.translate.instant('QUIZ_MANAGER.CONFIRM.DELETE_QUIZ_WARNING')}`;
    if (confirm(confirmMessage)) {
      try {
        await this.quizService.deleteQuiz(quiz.id!);
        console.log('Quiz deleted successfully');
      } catch (error) {
        console.error('Error deleting quiz:', error);
        console.log('Error deleting quiz');
      }
    }
  }

  // Card operations
  openCardEditor(quiz: Quiz): void {
    // TODO: Implement card editor functionality without Material Dialog
    console.log('Opening card editor for quiz:', quiz.name);
  }

  // Study mode
  startStudyMode(quiz: Quiz): void {
    if (safeArray(quiz.cards).length === 0) {
      console.log('No cards available for study mode');
      return;
    }

    // TODO: Implement study mode functionality without Material Dialog
    console.log('Starting study mode for quiz:', quiz.name);
  }

  // Statistics
  showQuizStats(quiz: Quiz): void {
    // TODO: Implement quiz stats functionality without Material Dialog
    console.log('Showing stats for quiz:', quiz.name);
  }

  showQuizAnalytics(quiz: Quiz): void {
    // TODO: Implement analytics dialog
    console.log('Analytics for quiz:', quiz);
    console.log('Részletes elemzés funkció fejlesztés alatt');
  }

  // Utility methods
  getQuizTags(quiz: Quiz): string[] {
    const tags = new Set<string>();
    safeArray(quiz.cards).forEach((card: QuizCard) => {
      safeArray(card.tags).forEach((tag: string) => tags.add(tag));
    });
    return Array.from(tags);
  }

  getSortLabel(sort: SortBy): string {
    const labels = {
      'name': 'Név',
      'created': 'Létrehozva',
      'updated': 'Módosítva',
      'cards': 'Kártyák'
    };
    return labels[sort] || sort;
  }

  private findFolderById(folders: QuizFolder[], id: string): QuizFolder | null {
    for (const folder of folders) {
      if (folder.id === id) return folder;
      // Az új struktúrában nincsenek children, csak project_id alapján hierarchia
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
      console.log('Quiz exported successfully');
    } catch (error) {
      console.error('Error exporting quiz:', error);
      console.log('Error exporting quiz');
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
      console.log('Move functionality not implemented yet');
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  }
}
