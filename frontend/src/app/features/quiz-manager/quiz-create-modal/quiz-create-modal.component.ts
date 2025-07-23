import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { QuizService, Quiz } from '../../../core/services/quiz.service';

@Component({
  selector: 'app-quiz-create-modal',
  templateUrl: './quiz-create-modal.component.html',
  styleUrls: ['./quiz-create-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TranslateModule]
})
export class QuizCreateModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<Quiz>();

  newQuiz: Partial<Quiz> = {
    name: '',
    description: '',
    difficulty_level: 2, // Közepes alapértelmezett
    visibility: 'private',
    tags: [],
    language: 'hu',
    study_modes: ['flashcard']
  };

  difficultyLevels = [
    { value: 1, label: 'Könnyű', color: '#4caf50' },
    { value: 2, label: 'Közepes', color: '#ff9800' },
    { value: 3, label: 'Nehéz', color: '#f44336' }
  ];

  isLoading = false;
  error: string | null = null;

  constructor(private quizService: QuizService) {}

  ngOnInit() {
    // Modal megnyitásakor focus a név mezőre
    setTimeout(() => {
      const nameInput = document.querySelector('#quiz-name') as HTMLInputElement;
      if (nameInput) {
        nameInput.focus();
      }
    }, 100);
  }

  async onSave() {
    if (!this.newQuiz.name?.trim()) {
      this.error = 'A kvíz neve kötelező!';
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      // Beállítjuk az alapértelmezett színt a nehézségi szint alapján
      const selectedDifficulty = this.difficultyLevels.find(d => d.value === this.newQuiz.difficulty_level);
      this.newQuiz.color = selectedDifficulty?.color || '#667eea';

      // Átmenetileg eltávolítjuk a hiányzó mezőket az API hívásból
      const quizData = {
        name: this.newQuiz.name,
        description: this.newQuiz.description,
        color: this.newQuiz.color,
        visibility: this.newQuiz.visibility,
        tags: this.newQuiz.tags || []
      };

      const savedQuiz = await this.quizService.createQuiz(quizData as Omit<Quiz, 'id' | 'user_id' | 'created_at' | 'updated_at'>);
      this.created.emit(savedQuiz);
      this.onClose();
    } catch (err: any) {
      this.error = err?.message || 'Hiba történt a kvíz létrehozása során.';
    } finally {
      this.isLoading = false;
    }
  }

  onClose() {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.onClose();
    }
  }

  addTag(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      const input = event.target as HTMLInputElement;
      const tag = input.value.trim();
      if (tag && !this.newQuiz.tags?.includes(tag)) {
        this.newQuiz.tags = [...(this.newQuiz.tags || []), tag];
        input.value = '';
      }
    }
  }

  removeTag(tag: string) {
    this.newQuiz.tags = this.newQuiz.tags?.filter(t => t !== tag) || [];
  }
}
