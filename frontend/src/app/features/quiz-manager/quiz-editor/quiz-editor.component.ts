import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { QuizService, Quiz } from '../../../core/services/quiz.service';

@Component({
  selector: 'app-quiz-editor',
  templateUrl: './quiz-editor.component.html',
  styleUrls: ['./quiz-editor.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule]
})
export class QuizEditorComponent implements OnInit {
  @Input() quiz: Quiz | null = null;
  @Output() back = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Quiz>();

  editingQuiz: Quiz = {
    name: '',
    description: '',
    color: '#1976d2',
    visibility: 'private',
    tags: [],
    difficulty_level: 3,
    estimated_time: 10,
    study_modes: ['flashcard'],
    language: 'hu',
    cards: []
  };

  isLoading = false;
  error: string | null = null;
  isNewQuiz = false;

  // Színek a választáshoz
  colorOptions = [
    '#1976d2', '#2e7d32', '#f57c00', '#d32f2f', 
    '#7b1fa2', '#303f9f', '#388e3c', '#f9a825'
  ];

  constructor(private quizService: QuizService) {}

  ngOnInit() {
    if (this.quiz) {
      // Meglévő kvíz szerkesztése
      this.editingQuiz = { ...this.quiz };
      this.isNewQuiz = false;
    } else {
      // Új kvíz létrehozása
      this.isNewQuiz = true;
    }
  }

  async onSave() {
    if (!this.editingQuiz.name.trim()) {
      this.error = 'A kvíz neve kötelező!';
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      let savedQuiz: Quiz;
      
      if (this.isNewQuiz) {
        savedQuiz = await this.quizService.createQuiz(this.editingQuiz);
      } else {
        savedQuiz = await this.quizService.updateQuiz(this.editingQuiz.id!, this.editingQuiz);
      }
      
      this.saved.emit(savedQuiz);
      this.back.emit();
    } catch (err: any) {
      this.error = err?.message || 'Hiba történt a mentés során.';
    } finally {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.back.emit();
  }

  addTag(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      const input = event.target as HTMLInputElement;
      const tag = input.value.trim();
      if (tag && !this.editingQuiz.tags.includes(tag)) {
        this.editingQuiz.tags.push(tag);
        input.value = '';
      }
    }
  }

  removeTag(tag: string) {
    this.editingQuiz.tags = this.editingQuiz.tags.filter(t => t !== tag);
  }
}
