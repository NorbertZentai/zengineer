import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { QuizCard } from '../../../../../core/services/quiz.service';

@Component({
  standalone: true,
  selector: 'app-card-list',
  templateUrl: './card-list.html',
  styleUrls: ['./card-list-simple.scss'],
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
    MatChipsModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
    DragDropModule
  ]
})
export class CardListComponent {
  @Input() cards: QuizCard[] = [];
  @Input() selectedCards: Set<string> = new Set();
  @Input() bulkEditMode = false;
  @Input() selectAllChecked = false;

  @Output() cardEdit = new EventEmitter<number>();
  @Output() cardDelete = new EventEmitter<string>();
  @Output() cardSelect = new EventEmitter<string>();
  @Output() selectAll = new EventEmitter<boolean>();
  @Output() cardsReorder = new EventEmitter<CdkDragDrop<QuizCard[]>>();

  difficulties = [
    { value: 'easy', label: 'Könnyű', color: '#4caf50' },
    { value: 'medium', label: 'Közepes', color: '#ff9800' },
    { value: 'hard', label: 'Nehéz', color: '#f44336' }
  ];

  onCardEdit(index: number): void {
    this.cardEdit.emit(index);
  }

  onCardDelete(cardId: string): void {
    this.cardDelete.emit(cardId);
  }

  onCardSelect(cardId: string): void {
    this.cardSelect.emit(cardId);
  }

  onSelectAll(checked: boolean): void {
    this.selectAll.emit(checked);
  }

  onCardsReorder(event: CdkDragDrop<QuizCard[]>): void {
    this.cardsReorder.emit(event);
  }

  getDifficultyInfo(difficulty: string) {
    return this.difficulties.find(d => d.value === difficulty) || this.difficulties[1];
  }

  isCardSelected(cardId: string): boolean {
    return this.selectedCards.has(cardId);
  }

  trackByCardId(index: number, card: QuizCard): string {
    return card.id || index.toString();
  }

  getSuccessRateColor(rate: number): string {
    if (rate >= 0.8) return '#4caf50';
    if (rate >= 0.6) return '#ff9800';
    return '#f44336';
  }

  formatSuccessRate(rate: number): string {
    return `${Math.round(rate * 100)}%`;
  }
}
