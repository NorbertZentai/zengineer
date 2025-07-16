import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { QuizService, Quiz, QuizCard } from '../../../core/services/quiz.service';

@Component({
  standalone: true,
  selector: 'app-quiz-card-editor',
  templateUrl: './quiz-card-editor.html',
  styleUrls: ['./quiz-card-editor-simple.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatChipsModule,
    MatTabsModule,
    MatIconModule,
    MatCheckboxModule,
    MatSnackBarModule,
    DragDropModule
  ]
})
export class QuizCardEditorComponent {
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

  // Bulk operations
  selectedCards = signal<Set<string>>(new Set());
  bulkEditMode = signal(false);
  selectAllChecked = signal(false);

  // Import/Export templates
  cardTemplates = signal([
    { name: 'Alapértelmezett', format: 'question|answer|difficulty|tags' },
    { name: 'Egyszerű', format: 'front|back' },
    { name: 'Részletes', format: 'question|answer|explanation|difficulty|category|tags' }
  ]);

  // Filtered cards based on search and difficulty
  filteredCards = signal<QuizCard[]>([]);

  difficulties = [
    { value: 'easy', label: 'Könnyű', color: '#4caf50' },
    { value: 'medium', label: 'Közepes', color: '#ff9800' },
    { value: 'hard', label: 'Nehéz', color: '#f44336' }
  ];

  // Sample quiz data - replace with actual quiz input
  quiz: Quiz = {
    id: '1',
    name: 'Sample Quiz',
    description: 'A sample quiz for demonstration',
    cards: [],
    tags: [],
    color: '#667eea',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    folder_id: '',
    project_id: '',
    visibility: 'private',
    difficulty_level: 2,
    estimated_time: 30,
    study_modes: ['flashcard'],
    language: 'en'
  };

  constructor(
    private quizService: QuizService,
    private fb: FormBuilder
  ) {
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

  // Show bulk tags dialog
  showBulkTagsDialog(): void {
    const tagsInput = prompt('Add meg a címkéket vesszővel elválasztva:');
    if (tagsInput) {
      const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
      if (tags.length > 0) {
        this.bulkAddTags(tags);
      }
    }
  }

  // Search and filter methods
  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.updateFilteredCards();
  }

  onDifficultyFilter(difficulty: 'all' | 'easy' | 'medium' | 'hard'): void {
    this.selectedDifficulty.set(difficulty);
    this.updateFilteredCards();
  }

  async deleteCard(card: QuizCard): Promise<void> {
    if (!confirm(`Biztosan törölni szeretnéd ezt a kártyát?\n\nKérdés: ${card.front}`)) return;

    try {
      await this.quizService.deleteCard(this.quiz.id!, card.id!);
      this.cards.update(cards => cards.filter(c => c.id !== card.id));
      this.updateAvailableTags();
      
      console.log('Kártya törölve');
    } catch (error) {
      console.error('Error deleting card:', error);
      console.log('Hiba történt a kártya törlése közben');
    }
  }

  async duplicateCard(card: QuizCard): Promise<void> {
    try {
      const duplicatedCard = await this.quizService.addCard(this.quiz.id!, {
        front: card.front + ' (másolat)',
        back: card.back,
        difficulty: card.difficulty,
        tags: [...card.tags]
      });
      
      this.cards.update(cards => [...cards, duplicatedCard]);
      console.log('TODO: Show notification');
    } catch (error) {
      console.error('Error duplicating card:', error);
      console.log('TODO: Show notification');
    }
  }

  startEditCard(index: number): void {
    this.editingCardIndex.set(index);
  }

  async saveEditCard(card: QuizCard, updates: Partial<QuizCard>): Promise<void> {
    try {
      const updatedCard = await this.quizService.updateCard(this.quiz.id!, card.id!, updates);
      
      this.cards.update(cards => cards.map(c => 
        c.id === card.id ? { ...c, ...updatedCard } : c
      ));
      
      this.editingCardIndex.set(null);
      this.updateAvailableTags();
      
      console.log('TODO: Show notification');
    } catch (error) {
      console.error('Error updating card:', error);
      console.log('TODO: Show notification');
    }
  }

  cancelEdit(): void {
    this.editingCardIndex.set(null);
  }

  // Drag and drop
  onCardDrop(event: any): void {
    const cards = [...this.cards()];
    const item = cards[event.previousIndex];
    cards.splice(event.previousIndex, 1);
    cards.splice(event.currentIndex, 0, item);
    this.cards.set(cards);
  }

  // Tag management
  addTagToNewCard(tag: string): void {
    if (!tag.trim()) return;
    
    this.newCardTags.update(tags => {
      if (!tags.includes(tag.trim())) {
        return [...tags, tag.trim()];
      }
      return tags;
    });
  }

  removeTagFromNewCard(tag: string): void {
    this.newCardTags.update(tags => tags.filter(t => t !== tag));
  }

  // Utility methods
  getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'easy': return '#4caf50';
      case 'medium': return '#ff9800';
      case 'hard': return '#f44336';
      default: return '#9e9e9e';
    }
  }

  getDifficultyLabel(difficulty: string): string {
    switch (difficulty) {
      case 'easy': return 'Könnyű';
      case 'medium': return 'Közepes';
      case 'hard': return 'Nehéz';
      default: return 'Ismeretlen';
    }
  }

  resetNewCardForm(): void {
    this.newCardFront.set('');
    this.newCardBack.set('');
    this.newCardDifficulty.set('medium');
    this.newCardTags.set([]);
  }

  close(): void {
    console.log("TODO: Close editor");
  }

  cancel(): void {
    console.log("TODO: Close editor");
  }

  // Track by function for ngFor performance
  trackByCardId(index: number, card: QuizCard): string {
    return card.id || index.toString();
  }

  // Bulk selection methods
  toggleBulkEditMode(): void {
    this.bulkEditMode.update(mode => !mode);
    if (!this.bulkEditMode()) {
      this.selectedCards.set(new Set());
      this.selectAllChecked.set(false);
    }
  }

  toggleCardSelection(cardId: string): void {
    this.selectedCards.update(selected => {
      const newSelected = new Set(selected);
      if (newSelected.has(cardId)) {
        newSelected.delete(cardId);
      } else {
        newSelected.add(cardId);
      }
      this.updateSelectAllState();
      return newSelected;
    });
  }

  toggleSelectAll(): void {
    if (this.selectAllChecked()) {
      this.selectedCards.set(new Set());
      this.selectAllChecked.set(false);
    } else {
      const allCardIds = new Set(this.filteredCards().map(card => card.id!));
      this.selectedCards.set(allCardIds);
      this.selectAllChecked.set(true);
    }
  }

  private updateSelectAllState(): void {
    const filteredCardIds = this.filteredCards().map(card => card.id!);
    const selectedCount = filteredCardIds.filter(id => this.selectedCards().has(id)).length;
    this.selectAllChecked.set(selectedCount > 0 && selectedCount === filteredCardIds.length);
  }

  // Bulk operations
  async bulkDelete(): Promise<void> {
    const selectedIds = Array.from(this.selectedCards());
    if (selectedIds.length === 0) return;

    const confirmMessage = `Biztosan törölni szeretnéd a kijelölt ${selectedIds.length} kártyát?`;
    if (!confirm(confirmMessage)) return;

    try {
      for (const cardId of selectedIds) {
        await this.quizService.deleteCard(this.quiz.id!, cardId);
      }
      
      this.cards.update(cards => cards.filter(card => !selectedIds.includes(card.id!)));
      this.selectedCards.set(new Set());
      this.updateFilteredCards();
      this.updateAvailableTags();
      
      console.log(
        `${selectedIds.length} kártya sikeresen törölve`,
        'Bezárás',
        { duration: 3000 }
      );
    } catch (error) {
      console.error('Error deleting cards:', error);
      console.log('TODO: Show notification');
    }
  }

  async bulkUpdateDifficulty(difficulty: 'easy' | 'medium' | 'hard'): Promise<void> {
    const selectedIds = Array.from(this.selectedCards());
    if (selectedIds.length === 0) return;

    try {
      for (const cardId of selectedIds) {
        await this.quizService.updateCard(this.quiz.id!, cardId, { difficulty });
      }
      
      this.cards.update(cards => cards.map(card => 
        selectedIds.includes(card.id!) ? { ...card, difficulty } : card
      ));
      
      this.updateFilteredCards();
      
      console.log(
        `${selectedIds.length} kártya nehézsége frissítve`,
        'Bezárás',
        { duration: 3000 }
      );
    } catch (error) {
      console.error('Error updating difficulty:', error);
      console.log('TODO: Show notification');
    }
  }

  async bulkAddTags(tags: string[]): Promise<void> {
    const selectedIds = Array.from(this.selectedCards());
    if (selectedIds.length === 0 || tags.length === 0) return;

    try {
      for (const cardId of selectedIds) {
        const card = this.cards().find(c => c.id === cardId);
        if (card) {
          const updatedTags = [...new Set([...card.tags, ...tags])];
          await this.quizService.updateCard(this.quiz.id!, cardId, { tags: updatedTags });
        }
      }
      
      this.cards.update((cards: QuizCard[]) => cards.map((card: QuizCard) => {
        if (selectedIds.includes(card.id!)) {
          return { ...card, tags: [...new Set([...card.tags, ...tags])] };
        }
        return card;
      }));
      
      this.updateFilteredCards();
      this.updateAvailableTags();
      
      console.log(
        `Címkék hozzáadva ${selectedIds.length} kártyához`,
        'Bezárás',
        { duration: 3000 }
      );
    } catch (error) {
      console.error('Error adding tags:', error);
      console.log('TODO: Show notification');
    }
  }

  // Enhanced import functionality
  importCards(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        if (file.name.endsWith('.json')) {
          this.importFromJSON(content);
        } else if (file.name.endsWith('.csv')) {
          this.importFromCSV(content);
        } else if (file.name.endsWith('.txt')) {
          this.importFromText(content);
        } else {
          console.log('TODO: Show notification');
        }
      } catch (error) {
        console.error('Import error:', error);
        console.log('TODO: Show notification');
      }
    };
    
    reader.readAsText(file);
    input.value = ''; // Reset input
  }

  private async importFromJSON(content: string): Promise<void> {
    const data = JSON.parse(content);
    let cardsToImport: Partial<QuizCard>[] = [];

    if (Array.isArray(data)) {
      cardsToImport = data;
    } else if (data.cards && Array.isArray(data.cards)) {
      cardsToImport = data.cards;
    } else {
      throw new Error('Invalid JSON format');
    }

    await this.processImportedCards(cardsToImport);
  }

  private async importFromCSV(content: string): Promise<void> {
    const lines = content.split('\n').filter(line => line.trim());
    const cardsToImport: Partial<QuizCard>[] = [];

    for (let i = 1; i < lines.length; i++) { // Skip header
      const columns = this.parseCSVLine(lines[i]);
      if (columns.length >= 2) {
        cardsToImport.push({
          front: columns[0]?.trim(),
          back: columns[1]?.trim(),
          difficulty: (columns[2]?.trim() as 'easy' | 'medium' | 'hard') || 'medium',
          tags: columns[3] ? columns[3].split(',').map(tag => tag.trim()) : []
        });
      }
    }

    await this.processImportedCards(cardsToImport);
  }

  private async importFromText(content: string): Promise<void> {
    const lines = content.split('\n').filter(line => line.trim());
    const cardsToImport: Partial<QuizCard>[] = [];

    for (let i = 0; i < lines.length; i += 2) {
      if (i + 1 < lines.length) {
        cardsToImport.push({
          front: lines[i].trim(),
          back: lines[i + 1].trim(),
          difficulty: 'medium',
          tags: []
        });
      }
    }

    await this.processImportedCards(cardsToImport);
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  private async processImportedCards(cardsToImport: Partial<QuizCard>[]): Promise<void> {
    let successCount = 0;

    for (const cardData of cardsToImport) {
      if (cardData.front && cardData.back) {
        try {
          const newCard = await this.quizService.addCard(this.quiz.id!, {
            front: cardData.front,
            back: cardData.back,
            difficulty: cardData.difficulty || 'medium',
            tags: cardData.tags || []
          });
          
          this.cards.update((cards: QuizCard[]) => [...cards, newCard]);
          successCount++;
        } catch (error) {
          console.error('Error adding card:', error);
        }
      }
    }

    this.updateFilteredCards();
    this.updateAvailableTags();
    
    console.log(
      `${successCount} kártya sikeresen importálva ${cardsToImport.length} közül`,
      'Bezárás',
      { duration: 5000 }
    );
  }

  // Enhanced export functionality
  exportCards(): void {
    const cardsToExport = this.selectedCards().size > 0 
      ? this.cards().filter((card: QuizCard) => this.selectedCards().has(card.id!))
      : this.cards();

    if (cardsToExport.length === 0) {
      console.log('TODO: Show notification');
      return;
    }

    // Show export options dialog
    this.showExportDialog(cardsToExport);
  }

  private showExportDialog(cards: QuizCard[]): void {
    const format = prompt('Válaszd ki az export formátumot:\n1 - JSON\n2 - CSV\n3 - Text', '1');
    
    switch (format) {
      case '1':
        this.exportAsJSON(cards);
        break;
      case '2':
        this.exportAsCSV(cards);
        break;
      case '3':
        this.exportAsText(cards);
        break;
      default:
        console.log('TODO: Show notification');
    }
  }

  private exportAsJSON(cards: QuizCard[]): void {
    const data = {
      quiz: {
        name: this.quiz.name,
        description: this.quiz.description
      },
      cards: cards.map(card => ({
        front: card.front,
        back: card.back,
        difficulty: card.difficulty,
        tags: card.tags,
        reviewCount: card.reviewCount,
        successRate: card.successRate
      })),
      exportedAt: new Date().toISOString()
    };

    this.downloadFile(
      JSON.stringify(data, null, 2),
      `${this.quiz.name}_cards.json`,
      'application/json'
    );
  }

  private exportAsCSV(cards: QuizCard[]): void {
    const headers = ['Kérdés', 'Válasz', 'Nehézség', 'Címkék', 'Ismétlések', 'Sikerességi arány'];
    const csvContent = [
      headers.join(','),
      ...cards.map(card => [
        `"${card.front.replace(/"/g, '""')}"`,
        `"${card.back.replace(/"/g, '""')}"`,
        card.difficulty,
        `"${card.tags.join(', ')}"`,
        card.reviewCount.toString(),
        (card.successRate * 100).toFixed(1) + '%'
      ].join(','))
    ].join('\n');

    this.downloadFile(
      csvContent,
      `${this.quiz.name}_cards.csv`,
      'text/csv'
    );
  }

  private exportAsText(cards: QuizCard[]): void {
    const textContent = cards.map(card => 
      `${card.front}\n${card.back}\n---`
    ).join('\n\n');

    this.downloadFile(
      textContent,
      `${this.quiz.name}_cards.txt`,
      'text/plain'
    );
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
    
    console.log(
      `Kártyák exportálva: ${filename}`,
      'Bezárás',
      { duration: 3000 }
    );
  }
}
