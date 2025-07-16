import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface FilterOptions {
  searchQuery: string;
  sortBy: 'name' | 'created' | 'updated' | 'cards';
  sortDirection: 'asc' | 'desc';
  selectedTags: string[];
  difficulty: number | null;
  viewMode: 'grid' | 'list';
}

@Component({
  standalone: true,
  selector: 'app-quiz-filter',
  templateUrl: './quiz-filter.html',
  styleUrls: ['./quiz-filter-simple.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatTooltipModule
  ]
})
export class QuizFilterComponent {
  @Input() availableTags: string[] = [];
  @Input() filters: FilterOptions = {
    searchQuery: '',
    sortBy: 'name',
    sortDirection: 'asc',
    selectedTags: [],
    difficulty: null,
    viewMode: 'grid'
  };

  @Output() filtersChange = new EventEmitter<FilterOptions>();
  @Output() createQuiz = new EventEmitter<void>();
  @Output() createFolder = new EventEmitter<void>();

  showAdvancedFilters = signal(false);

  sortOptions = [
    { value: 'name', label: 'Név' },
    { value: 'created', label: 'Létrehozás dátuma' },
    { value: 'updated', label: 'Módosítás dátuma' },
    { value: 'cards', label: 'Kártyák száma' }
  ];

  difficultyOptions = [
    { value: null, label: 'Minden nehézség' },
    { value: 1, label: 'Nagyon könnyű' },
    { value: 2, label: 'Könnyű' },
    { value: 3, label: 'Közepes' },
    { value: 4, label: 'Nehéz' },
    { value: 5, label: 'Nagyon nehéz' }
  ];

  onSearchChange(value: string): void {
    this.updateFilters({ searchQuery: value });
  }

  onSortChange(sortBy: string): void {
    this.updateFilters({ sortBy: sortBy as any });
  }

  onSortDirectionToggle(): void {
    const newDirection = this.filters.sortDirection === 'asc' ? 'desc' : 'asc';
    this.updateFilters({ sortDirection: newDirection });
  }

  onViewModeChange(viewMode: 'grid' | 'list'): void {
    this.updateFilters({ viewMode });
  }

  onDifficultyChange(difficulty: number | null): void {
    this.updateFilters({ difficulty });
  }

  onTagToggle(tag: string): void {
    const selectedTags = [...this.filters.selectedTags];
    const index = selectedTags.indexOf(tag);
    
    if (index === -1) {
      selectedTags.push(tag);
    } else {
      selectedTags.splice(index, 1);
    }
    
    this.updateFilters({ selectedTags });
  }

  onTagRemove(tag: string): void {
    const selectedTags = this.filters.selectedTags.filter(t => t !== tag);
    this.updateFilters({ selectedTags });
  }

  clearFilters(): void {
    const clearedFilters: FilterOptions = {
      searchQuery: '',
      sortBy: 'name',
      sortDirection: 'asc',
      selectedTags: [],
      difficulty: null,
      viewMode: this.filters.viewMode // Keep view mode
    };
    this.filtersChange.emit(clearedFilters);
  }

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters.update(show => !show);
  }

  onCreateQuiz(): void {
    this.createQuiz.emit();
  }

  onCreateFolder(): void {
    this.createFolder.emit();
  }

  private updateFilters(updates: Partial<FilterOptions>): void {
    const newFilters = { ...this.filters, ...updates };
    this.filtersChange.emit(newFilters);
  }

  get selectedDifficultyLabel(): string {
    const option = this.difficultyOptions.find(d => d.value === this.filters.difficulty);
    return option?.label || '';
  }

  get hasActiveFilters(): boolean {
    return this.filters.searchQuery !== '' ||
           this.filters.selectedTags.length > 0 ||
           this.filters.difficulty !== null ||
           this.filters.sortBy !== 'name' ||
           this.filters.sortDirection !== 'asc';
  }
}
