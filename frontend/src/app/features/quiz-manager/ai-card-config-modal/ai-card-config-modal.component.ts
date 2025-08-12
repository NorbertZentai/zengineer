import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

export interface AiCardConfiguration {
  cardCount: number;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  correctAnswers: number;
  wrongAnswers: number;
  language: string;
  includeExplanations: boolean;
  questionType: 'multiple_choice' | 'true_false' | 'fill_in_blank';
}

@Component({
  selector: 'app-ai-card-config-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TranslateModule],
  templateUrl: './ai-card-config-modal.component.html',
  styleUrls: ['./ai-card-config-modal.component.scss']
})
export class AiCardConfigModalComponent {
  @Input() quizId: string = '';
  @Input() quizName: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() generateCards = new EventEmitter<AiCardConfiguration>();

  configuration: AiCardConfiguration = {
    cardCount: 5,
    topic: '',
    difficulty: 'medium',
    correctAnswers: 1,
    wrongAnswers: 3,
    language: 'hu',
    includeExplanations: true,
    questionType: 'multiple_choice'
  };

  difficultyOptions = [
    { value: 'easy' as const, labelKey: 'DIFFICULTY_LEVEL.EASY', icon: 'sentiment_satisfied' },
    { value: 'medium' as const, labelKey: 'DIFFICULTY_LEVEL.MEDIUM', icon: 'sentiment_neutral' },
    { value: 'hard' as const, labelKey: 'DIFFICULTY_LEVEL.HARD', icon: 'sentiment_very_dissatisfied' }
  ];

  languageOptions = [
    { value: 'hu', label: 'Magyar' },
    { value: 'en', label: 'English' }
  ];

  questionTypeOptions = [
    { value: 'multiple_choice' as const, labelKey: 'AI.QUESTION_TYPES.MULTIPLE_CHOICE', icon: 'radio_button_checked' },
    { value: 'true_false' as const, labelKey: 'AI.QUESTION_TYPES.TRUE_FALSE', icon: 'thumbs_up_down' },
    { value: 'fill_in_blank' as const, labelKey: 'AI.QUESTION_TYPES.FILL_IN_BLANK', icon: 'edit' }
  ];

  constructor(private translate: TranslateService) {}

  onClose(): void {
    this.close.emit();
  }

  onGenerateCards(): void {
    if (this.isConfigurationValid()) {
      this.generateCards.emit(this.configuration);
    }
  }

  isConfigurationValid(): boolean {
    return this.configuration.topic.trim().length > 0 &&
           this.configuration.cardCount >= 1 &&
           this.configuration.cardCount <= 15 &&
           this.configuration.correctAnswers >= 1 &&
           this.configuration.correctAnswers <= 3 &&
           this.configuration.wrongAnswers >= 1 &&
           this.configuration.wrongAnswers <= 3;
  }

  incrementCardCount(): void {
    if (this.configuration.cardCount < 15) {
      this.configuration.cardCount++;
    }
  }

  decrementCardCount(): void {
    if (this.configuration.cardCount > 1) {
      this.configuration.cardCount--;
    }
  }

  incrementCorrectAnswers(): void {
    if (this.configuration.correctAnswers < 3) {
      this.configuration.correctAnswers++;
    }
  }

  decrementCorrectAnswers(): void {
    if (this.configuration.correctAnswers > 1) {
      this.configuration.correctAnswers--;
    }
  }

  incrementWrongAnswers(): void {
    if (this.configuration.wrongAnswers < 3) {
      this.configuration.wrongAnswers++;
    }
  }

  decrementWrongAnswers(): void {
    if (this.configuration.wrongAnswers > 1) {
      this.configuration.wrongAnswers--;
    }
  }

  getTotalAnswers(): number {
    return this.configuration.correctAnswers + this.configuration.wrongAnswers;
  }

  getDifficultyLabel(): string {
    const option = this.difficultyOptions.find(d => d.value === this.configuration.difficulty);
    return option ? this.translate.instant(option.labelKey) : '';
  }
}
