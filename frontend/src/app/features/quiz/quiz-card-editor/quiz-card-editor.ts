import { Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { QuizService, Quiz, QuizCard } from '../../../core/services/quiz.service';

@Component({
  standalone: true,
  selector: 'app-quiz-card-editor',
  templateUrl: './quiz-card-editor.html',
  styleUrls: ['./quiz-card-editor.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatTabsModule,
    DragDropModule
  ]
})
export class QuizCardEditorComponent {
  quiz: Quiz;
  cards = signal<QuizCard[]>([]);
  editingCardIndex = signal<number | null>(null);
  newCardFront = signal('');
  newCardBack = signal('');
  newCardDifficulty = signal<'easy' | 'medium' | 'hard'>('medium');
  newCardTags = signal<string[]>([]);
  searchQuery = signal('');
  selectedDifficulty = signal<'all' | 'easy' | 'medium' | 'hard'>('all');

  // Available tags from all cards
  availableTags = signal<string[]>([]);

  // Filtered cards based on search and difficulty
  filteredCards = signal<QuizCard[]>([]);

  difficulties = [
    { value: 'easy', label: 'Könnyű', color: '#4caf50' },
    { value: 'medium', label: 'Közepes', color: '#ff9800' },
    { value: 'hard', label: 'Nehéz', color: '#f44336' }
  ];

  constructor(
    private dialogRef: MatDialogRef<QuizCardEditorComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { quiz: Quiz },
    private quizService: QuizService,
    private fb: FormBuilder
  ) {
    this.quiz = data.quiz;
    this.cards.set([...(this.quiz.cards || [])]);
    this.updateFilteredCards();
    this.updateAvailableTags();
  }

  updateFilteredCards(): void {
    let filtered = this.cards();
    
    // Filter by search query
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(card => 
        card.front.toLowerCase().includes(query) ||
        card.back.toLowerCase().includes(query) ||
        card.tags.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }
    
    // Filter by difficulty
    const difficulty = this.selectedDifficulty();
    if (difficulty !== 'all') {
      filtered = filtered.filter(card => card.difficulty === difficulty);
    }
    
    this.filteredCards.set(filtered);
  }

  updateAvailableTags(): void {
    const allTags = new Set<string>();
    this.cards().forEach(card => {
      card.tags.forEach((tag: string) => allTags.add(tag));
    });
    this.availableTags.set(Array.from(allTags).sort());
  }

  async addCard(): Promise<void> {
    const front = this.newCardFront().trim();
    const back = this.newCardBack().trim();
    
    if (!front || !back) return;
    
    try {
      const newCard = await this.quizService.addCard(this.quiz.id!, {
        front,
        back,
        difficulty: this.newCardDifficulty(),
        reviewCount: 0,
        successRate: 0,
        tags: [...this.newCardTags()]
      });
      
      this.cards.update(cards => [...cards, newCard]);
      this.updateFilteredCards();
      this.updateAvailableTags();
      this.resetNewCardForm();
    } catch (error) {
      console.error('Error adding card:', error);
    }
  }

  startEditCard(index: number): void {
    const card = this.filteredCards()[index];
    const originalIndex = this.cards().findIndex(c => c.id === card.id);
    this.editingCardIndex.set(originalIndex);
  }

  async saveEditCard(card: QuizCard, updates: Partial<QuizCard>): Promise<void> {
    try {
      await this.quizService.updateCard(this.quiz.id!, card.id!, updates);
      
      this.cards.update(cards => 
        cards.map(c => c.id === card.id ? { ...c, ...updates } : c)
      );
      
      this.updateFilteredCards();
      this.updateAvailableTags();
      this.editingCardIndex.set(null);
    } catch (error) {
      console.error('Error updating card:', error);
    }
  }

  cancelEdit(): void {
    this.editingCardIndex.set(null);
  }

  async deleteCard(card: QuizCard): Promise<void> {
    if (!confirm('Biztosan törölni szeretnéd ezt a kártyát?')) return;
    
    try {
      await this.quizService.deleteCard(this.quiz.id!, card.id!);
      
      this.cards.update(cards => cards.filter(c => c.id !== card.id));
      this.updateFilteredCards();
      this.updateAvailableTags();
    } catch (error) {
      console.error('Error deleting card:', error);
    }
  }

  duplicateCard(card: QuizCard): void {
    const newCard: Omit<QuizCard, 'id' | 'created_at' | 'updated_at'> = {
      question: card.front + ' (másolat)',
      answer: card.back,
      front: card.front + ' (másolat)',
      back: card.back,
      difficulty: card.difficulty,
      reviewCount: 0,
      successRate: 0,
      tags: [...card.tags]
    };        this.quizService.addCard(this.quiz.id!, newCard).then((addedCard: QuizCard) => {
      this.cards.update(cards => [...cards, addedCard]);
      this.updateFilteredCards();
      this.updateAvailableTags();
    });
  }

  onCardDrop(event: CdkDragDrop<QuizCard[]>): void {
    const cards = this.cards();
    moveItemInArray(cards, event.previousIndex, event.currentIndex);
    this.cards.set(cards);
    this.updateFilteredCards();
  }

  addTagToNewCard(tag: string): void {
    if (tag.trim() && !this.newCardTags().includes(tag.trim())) {
      this.newCardTags.update(tags => [...tags, tag.trim()]);
    }
  }

  removeTagFromNewCard(tag: string): void {
    this.newCardTags.update(tags => tags.filter(t => t !== tag));
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.updateFilteredCards();
  }

  onDifficultyFilter(difficulty: 'all' | 'easy' | 'medium' | 'hard'): void {
    this.selectedDifficulty.set(difficulty);
    this.updateFilteredCards();
  }

  getDifficultyColor(difficulty: string): string {
    return this.difficulties.find(d => d.value === difficulty)?.color || '#666';
  }

  getDifficultyLabel(difficulty: string): string {
    return this.difficulties.find(d => d.value === difficulty)?.label || difficulty;
  }

  exportCards(): void {
    const data = JSON.stringify(this.cards(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.quiz.name}-cards.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  importCards(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedCards = JSON.parse(e.target?.result as string);
        // Validate and add imported cards
        console.log('Imported cards:', importedCards);
      } catch (error) {
        console.error('Error importing cards:', error);
      }
    };
    reader.readAsText(file);
  }

  resetNewCardForm(): void {
    this.newCardFront.set('');
    this.newCardBack.set('');
    this.newCardDifficulty.set('medium');
    this.newCardTags.set([]);
  }

  close(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  // Track by function for ngFor performance
  trackByCardId(index: number, card: QuizCard): string {
    return card.id || index.toString();
  }
}
