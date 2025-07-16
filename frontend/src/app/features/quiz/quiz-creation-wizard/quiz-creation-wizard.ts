import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSliderModule } from '@angular/material/slider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { QuizService, Quiz, QuizCard } from '../../../core/services/quiz.service';

interface QuizTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultSettings: {
    difficulty: 'easy' | 'medium' | 'hard';
    autoReview: boolean;
    shuffleCards: boolean;
    timeLimit?: number;
  };
  sampleCards: Partial<QuizCard>[];
}

interface QuizCreationData {
  basic: {
    name: string;
    description: string;
    category: string;
    tags: string[];
  };
  settings: {
    difficulty: 'easy' | 'medium' | 'hard';
    autoReview: boolean;
    shuffleCards: boolean;
    timeLimit?: number;
    dailyGoal?: number;
  };
  cards: Partial<QuizCard>[];
  template?: QuizTemplate;
}

@Component({
  standalone: true,
  selector: 'app-quiz-creation-wizard',
  templateUrl: './quiz-creation-wizard.html',
  styleUrls: ['./quiz-creation-wizard.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatStepperModule,
    MatCardModule,
    MatCheckboxModule,
    MatSliderModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatIconModule
  ]
})
export class QuizCreationWizardComponent {
  // Form groups for each step
  basicInfoForm: FormGroup;
  settingsForm: FormGroup;
  cardsForm: FormGroup;

  // Wizard state
  currentStep = signal(0);
  isLoading = signal(false);
  
  // Quiz data
  quizData = signal<QuizCreationData>({
    basic: {
      name: '',
      description: '',
      category: '',
      tags: []
    },
    settings: {
      difficulty: 'medium',
      autoReview: true,
      shuffleCards: false,
      timeLimit: undefined,
      dailyGoal: 10
    },
    cards: []
  });

  // Templates
  templates = signal<QuizTemplate[]>([
    {
      id: 'language',
      name: 'Nyelvtanulás',
      description: 'Szavak és kifejezések gyakorlása',
      icon: 'translate',
      defaultSettings: {
        difficulty: 'medium',
        autoReview: true,
        shuffleCards: true
      },
      sampleCards: [
        { front: 'Hello', back: 'Helló', difficulty: 'easy', tags: ['alapszó'] },
        { front: 'Thank you', back: 'Köszönöm', difficulty: 'easy', tags: ['udvariasság'] },
        { front: 'How are you?', back: 'Hogy vagy?', difficulty: 'medium', tags: ['beszélgetés'] }
      ]
    },
    {
      id: 'programming',
      name: 'Programozás',
      description: 'Kódolási fogalmak és szintaxis',
      icon: 'code',
      defaultSettings: {
        difficulty: 'hard',
        autoReview: true,
        shuffleCards: false
      },
      sampleCards: [
        { front: 'Mi a változó?', back: 'Adatok tárolására szolgáló tárterület', difficulty: 'easy', tags: ['alapok'] },
        { front: 'Mi a függvény?', back: 'Újrafelhasználható kódblokk', difficulty: 'medium', tags: ['függvények'] },
        { front: 'Mi az OOP?', back: 'Objektumorientált programozás', difficulty: 'hard', tags: ['paradigma'] }
      ]
    },
    {
      id: 'science',
      name: 'Tudomány',
      description: 'Tudományos tények és fogalmak',
      icon: 'science',
      defaultSettings: {
        difficulty: 'medium',
        autoReview: true,
        shuffleCards: true
      },
      sampleCards: [
        { front: 'Mi a fotoszintézis?', back: 'A növények energia-termelési folyamata', difficulty: 'medium', tags: ['biológia'] },
        { front: 'Mi a gravitáció?', back: 'Tömegek közötti vonzó erő', difficulty: 'medium', tags: ['fizika'] },
        { front: 'Mi a H2O?', back: 'Víz kémiai képlete', difficulty: 'easy', tags: ['kémia'] }
      ]
    },
    {
      id: 'history',
      name: 'Történelem',
      description: 'Történelmi események és dátumok',
      icon: 'history_edu',
      defaultSettings: {
        difficulty: 'medium',
        autoReview: true,
        shuffleCards: true
      },
      sampleCards: [
        { front: 'Mikor volt a mohácsi csata?', back: '1526', difficulty: 'medium', tags: ['magyar történelem'] },
        { front: 'Ki volt Mátyás király?', back: 'Magyarország reneszánsz kori királya', difficulty: 'easy', tags: ['királyok'] }
      ]
    },
    {
      id: 'custom',
      name: 'Egyedi',
      description: 'Saját témakör létrehozása',
      icon: 'create',
      defaultSettings: {
        difficulty: 'medium',
        autoReview: true,
        shuffleCards: false
      },
      sampleCards: []
    }
  ]);

  // Categories
  categories = [
    'Nyelvtanulás',
    'Programozás',
    'Tudomány',
    'Történelem',
    'Matematika',
    'Művészet',
    'Sport',
    'Zene',
    'Egyéb'
  ];

  // New card form
  newCardFront = signal('');
  newCardBack = signal('');
  newCardDifficulty = signal<'easy' | 'medium' | 'hard'>('medium');
  newCardTags = signal<string[]>([]);

  constructor(
    private fb: FormBuilder,
    private quizService: QuizService
  ) {
    this.basicInfoForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      category: ['', Validators.required],
      tags: [[]]
    });

    this.settingsForm = this.fb.group({
      difficulty: ['medium'],
      autoReview: [true],
      shuffleCards: [false],
      timeLimit: [null],
      dailyGoal: [10]
    });

    this.cardsForm = this.fb.group({
      cards: [[], Validators.required]
    });
  }

  // Template selection
  selectTemplate(template: QuizTemplate): void {
    this.quizData.update(data => ({
      ...data,
      template,
      basic: {
        ...data.basic,
        category: template.name,
        tags: template.sampleCards.flatMap(card => card.tags || [])
          .filter((tag, index, arr) => arr.indexOf(tag) === index)
      },
      settings: {
        ...data.settings,
        ...template.defaultSettings
      },
      cards: [...template.sampleCards]
    }));

    // Update forms with template data
    this.basicInfoForm.patchValue({
      category: template.name
    });

    this.settingsForm.patchValue(template.defaultSettings);

    this.nextStep();
  }

  // Step navigation
  nextStep(): void {
    if (this.canProceedToNext()) {
      this.currentStep.update(step => step + 1);
      this.updateQuizData();
    }
  }

  previousStep(): void {
    this.currentStep.update(step => Math.max(0, step - 1));
  }

  canProceedToNext(): boolean {
    const step = this.currentStep();
    switch (step) {
      case 0: // Template selection
        return true;
      case 1: // Basic info
        return this.basicInfoForm.valid;
      case 2: // Settings
        return this.settingsForm.valid;
      case 3: // Cards
        return this.quizData().cards.length > 0;
      default:
        return false;
    }
  }

  private updateQuizData(): void {
    const step = this.currentStep();
    
    if (step === 2) { // After basic info
      this.quizData.update(data => ({
        ...data,
        basic: this.basicInfoForm.value
      }));
    } else if (step === 3) { // After settings
      this.quizData.update(data => ({
        ...data,
        settings: this.settingsForm.value
      }));
    }
  }

  // Card management
  addCard(): void {
    if (!this.newCardFront().trim() || !this.newCardBack().trim()) {
      console.log('Kérjük add meg a kérdést és a választ is!', 'Bezárás', { duration: 3000 });
      return;
    }

    const newCard: Partial<QuizCard> = {
      front: this.newCardFront().trim(),
      back: this.newCardBack().trim(),
      difficulty: this.newCardDifficulty(),
      tags: [...this.newCardTags()]
    };

    this.quizData.update(data => ({
      ...data,
      cards: [...data.cards, newCard]
    }));

    this.resetCardForm();
  }

  removeCard(index: number): void {
    this.quizData.update(data => ({
      ...data,
      cards: data.cards.filter((_, i) => i !== index)
    }));
  }

  editCard(index: number, updatedCard: Partial<QuizCard>): void {
    this.quizData.update(data => ({
      ...data,
      cards: data.cards.map((card, i) => i === index ? updatedCard : card)
    }));
  }

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

  private resetCardForm(): void {
    this.newCardFront.set('');
    this.newCardBack.set('');
    this.newCardDifficulty.set('medium');
    this.newCardTags.set([]);
  }

  // Tag management for basic info
  addTagToBasic(tag: string): void {
    if (!tag.trim()) return;
    
    this.quizData.update(data => {
      const tags = data.basic.tags;
      if (!tags.includes(tag.trim())) {
        return {
          ...data,
          basic: {
            ...data.basic,
            tags: [...tags, tag.trim()]
          }
        };
      }
      return data;
    });

    // Update form control
    this.basicInfoForm.patchValue({
      tags: this.quizData().basic.tags
    });
  }

  removeTagFromBasic(tag: string): void {
    this.quizData.update(data => ({
      ...data,
      basic: {
        ...data.basic,
        tags: data.basic.tags.filter(t => t !== tag)
      }
    }));

    // Update form control
    this.basicInfoForm.patchValue({
      tags: this.quizData().basic.tags
    });
  }

  // Quiz creation
  async createQuiz(): Promise<void> {
    if (!this.canProceedToNext()) return;

    this.isLoading.set(true);
    this.updateQuizData();

    try {
      const data = this.quizData();
      
      // Create the quiz with all required fields
      const quiz = await this.quizService.createQuiz({
        name: data.basic.name,
        description: data.basic.description || '',
        color: '#2196f3',
        visibility: 'private' as const,
        tags: data.basic.tags || [],
        subject: data.basic.category || '',
        difficulty_level: data.settings?.difficulty === 'easy' ? 1 : data.settings?.difficulty === 'medium' ? 3 : 5,
        estimated_time: data.settings?.timeLimit || 15,
        study_modes: ['flashcard'],
        language: 'hu',
        project_id: this.quizService.currentProject()?.id,
        folder_id: this.quizService.currentFolder()?.id
      });

      // Add cards to the quiz
      for (const cardData of data.cards) {
        if (cardData.front && cardData.back) {
          await this.quizService.addCard(quiz.id!, cardData);
        }
      }

      console.log(
        `Quiz "${data.basic.name}" sikeresen létrehozva ${data.cards.length} kártyával!`,
        'Bezárás',
        { duration: 5000 }
      );

      console.log("TODO: Close wizard"); // quiz);
    } catch (error) {
      console.error('Error creating quiz:', error);
      console.log(
        'Hiba történt a quiz létrehozása közben.',
        'Bezárás',
        { duration: 3000 }
      );
    } finally {
      this.isLoading.set(false);
    }
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

  cancel(): void {
    console.log("TODO: Close wizard"); // );
  }
}
