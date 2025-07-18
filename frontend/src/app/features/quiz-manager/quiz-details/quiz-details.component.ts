import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { QuizService, Quiz, QuizCard } from '../../../core/services/quiz.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-quiz-details',
  templateUrl: './quiz-details.component.html',
  styleUrls: ['./quiz-details.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: '0', opacity: '0', overflow: 'hidden' }),
        animate('300ms ease-in-out', style({ height: '*', opacity: '1' }))
      ]),
      transition(':leave', [
        style({ height: '*', opacity: '1', overflow: 'hidden' }),
        animate('300ms ease-in-out', style({ height: '0', opacity: '0' }))
      ])
    ])
  ]
})
export class QuizDetailsComponent implements OnInit {
  quiz: Quiz | null = null;
  cards: QuizCard[] = [];
  isLoading = false;
  error: string | null = null;
  showCreateCard = false;
  showSettings = false;
  
  // Szerkesztési form
  editForm = {
    name: '',
    description: '',
    color: '#667eea',
    visibility: 'private' as 'private' | 'public',
    difficulty_level: 3,
    language: 'hu',
    tags: [] as string[]
  };
  
  tagsString = ''; // Címkék stringként a form-hoz
  
  // Színpaletta
  colorPalette = [
    { name: 'Kék', value: '#667eea' },
    { name: 'Zöld', value: '#10b981' },
    { name: 'Lila', value: '#8b5cf6' },
    { name: 'Rózsaszín', value: '#ec4899' },
    { name: 'Narancssárga', value: '#f59e0b' },
    { name: 'Piros', value: '#ef4444' },
    { name: 'Türkiz', value: '#06b6d4' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Smaragd', value: '#059669' },
    { name: 'Lime', value: '#65a30d' },
    { name: 'Borostyán', value: '#d97706' },
    { name: 'Teal', value: '#0d9488' }
  ];
  
  // Új kártya form - egyszerűsített Knowt stílusú
  newCard = {
    question: '',
    answers: [
      { text: '', isCorrect: true }
    ] as { text: string; isCorrect: boolean }[],
    hint: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: QuizService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    const quizId = this.route.snapshot.paramMap.get('id');
    if (quizId) {
      await this.loadQuizDetails(quizId);
    }
  }

  async loadQuizDetails(quizId: string) {
    this.isLoading = true;
    this.error = null;
    
    try {
      await this.authService.waitForInit();
      
      // Betöltjük a kvízt és a kártyákat
      this.quiz = await this.quizService.getQuizById(quizId);
      this.cards = await this.quizService.getQuizCards(quizId);
      
      // Inicializáljuk az edit form-ot a kvíz adataival
      if (this.quiz) {
        this.editForm = {
          name: this.quiz.name || '',
          description: this.quiz.description || '',
          color: this.quiz.color || '#667eea',
          visibility: this.quiz.visibility || 'private',
          difficulty_level: this.quiz.difficulty_level || 3,
          language: this.quiz.language || 'hu',
          tags: this.quiz.tags || []
        };
        this.tagsString = this.editForm.tags.join(', ');
      }
      
    } catch (err: any) {
      this.error = err?.message || 'Hiba történt a kvíz betöltésekor';
    } finally {
      this.isLoading = false;
    }
  }

  goBack() {
    this.router.navigate(['/quiz-manager']);
  }

  // Új Knowt-stílusú függvények
  resetNewCard() {
    this.newCard = {
      question: '',
      answers: [
        { text: '', isCorrect: true }
      ],
      hint: ''
    };
  }

  toggleAnswerType(index: number) {
    this.newCard.answers[index].isCorrect = !this.newCard.answers[index].isCorrect;
  }

  addNewAnswer() {
    this.newCard.answers.push({ text: '', isCorrect: false });
  }

  removeAnswer(index: number) {
    if (this.newCard.answers.length > 1) {
      this.newCard.answers.splice(index, 1);
    }
  }

  handleAnswerEnter(index: number, event: any) {
    event.preventDefault();
    if (index === this.newCard.answers.length - 1) {
      this.addNewAnswer();
      // Focus következő input
      setTimeout(() => {
        const nextInput = document.querySelectorAll('.answer-input')[index + 1] as HTMLInputElement;
        if (nextInput) nextInput.focus();
      }, 50);
    }
  }

  focusFirstAnswer() {
    setTimeout(() => {
      const firstAnswerInput = document.querySelector('.answer-input') as HTMLInputElement;
      if (firstAnswerInput) firstAnswerInput.focus();
    }, 50);
  }

  isQuickCardValid(): boolean {
    if (!this.newCard.question.trim()) return false;
    
    const validAnswers = this.newCard.answers.filter(a => a.text.trim());
    if (validAnswers.length === 0) return false;
    
    const hasCorrectAnswer = this.newCard.answers.some(a => a.text.trim() && a.isCorrect);
    return hasCorrectAnswer;
  }

  async saveQuickCard() {
    if (!this.quiz?.id || !this.isQuickCardValid()) {
      return;
    }

    try {
      const validAnswers = this.newCard.answers.filter(a => a.text.trim());
      const correctAnswers = validAnswers.filter(a => a.isCorrect).map(a => a.text.trim());
      const incorrectAnswers = validAnswers.filter(a => !a.isCorrect).map(a => a.text.trim());

      // Kártya típus meghatározás
      const isFlashcard = correctAnswers.length === 1 && incorrectAnswers.length === 0;
      
      const cardData: Partial<QuizCard> = {
        question: this.newCard.question.trim(),
        card_type: isFlashcard ? 'flashcard' : 'multiple_choice',
        hint: this.newCard.hint?.trim() || undefined,
        difficulty: 1
      };

      if (isFlashcard) {
        // Flashcard: csak egy helyes válasz
        cardData.answer = correctAnswers[0];
      } else {
        // Multiple choice: helyes és helytelen válaszok
        cardData.correct_answers = correctAnswers;
        cardData.incorrect_answers = incorrectAnswers;
      }

      console.log('Kártya adatok mentése:', cardData);
      
      const card = await this.quizService.addCard(this.quiz.id, cardData);
      
      // Hozzáadjuk a flip állapotot az UI-hoz
      const cardWithFlip = { ...card, isFlipped: false };
      this.cards.unshift(cardWithFlip);
      
      this.resetNewCard();
      console.log('Kártya sikeresen létrehozva:', cardWithFlip);
      
    } catch (err: any) {
      console.error('Hiba a kártya mentése során:', err);
      console.error('Hiba részletei:', err?.message, err?.error_description, err?.details);
      this.error = 'Hiba történt a kártya mentése során: ' + (err.message || err?.error_description || 'Ismeretlen hiba');
    }
  }

  flipCard(card: any) {
    card.isFlipped = !card.isFlipped;
  }

  editCard(card: any) {
    // TODO: Implementáld a szerkesztést
    console.log('Kártya szerkesztése:', card);
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByCardId(index: number, card: any): string {
    return card.id || index.toString();
  }

  async deleteCard(cardId: string) {
    if (!confirm('Biztosan törölni szeretnéd ezt a kártyát?')) {
      return;
    }

    try {
      await this.quizService.deleteQuizCard(cardId);
      this.cards = this.cards.filter(card => card.id !== cardId);
    } catch (err: any) {
      this.error = err?.message || 'Hiba történt a kártya törlésekor';
    }
  }

  async editQuiz() {
    // TODO: Implement quiz editing
    console.log('Edit quiz:', this.quiz);
  }

  toggleSettings() {
    this.showSettings = !this.showSettings;
  }

  async saveSettings() {
    if (!this.quiz?.id || !this.editForm.name?.trim()) {
      return;
    }

    try {
      // Címkék feldolgozása
      this.editForm.tags = this.tagsString
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Kvíz frissítése
      const updatedQuiz = await this.quizService.updateQuiz(this.quiz.id, {
        name: this.editForm.name,
        description: this.editForm.description,
        color: this.editForm.color,
        visibility: this.editForm.visibility,
        difficulty_level: this.editForm.difficulty_level,
        language: this.editForm.language,
        tags: this.editForm.tags
      });

      // Lokális állapot frissítése
      this.quiz = { ...this.quiz, ...updatedQuiz };
      this.showSettings = false;
      
    } catch (err: any) {
      this.error = err?.message || 'Hiba történt a kvíz mentésekor';
    }
  }

  cancelEdit() {
    if (this.quiz) {
      // Visszaállítjuk az eredeti értékeket
      this.editForm = {
        name: this.quiz.name || '',
        description: this.quiz.description || '',
        color: this.quiz.color || '#667eea',
        visibility: this.quiz.visibility || 'private',
        difficulty_level: this.quiz.difficulty_level || 3,
        language: this.quiz.language || 'hu',
        tags: this.quiz.tags || []
      };
      this.tagsString = this.editForm.tags.join(', ');
    }
    this.showSettings = false;
  }

  selectColor(color: string) {
    this.editForm.color = color;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Debug function to test database structure
  async testDatabaseStructure() {
    console.log('🔍 Testing database structure...');
    
    if (!this.quiz?.id) {
      console.error('❌ No quiz loaded');
      return;
    }
    
    try {
      // Test 1: Try to query existing cards
      console.log('📋 Checking existing cards...');
      const cards = await this.quizService.getQuizCards(this.quiz.id);
      console.log('✅ Existing cards:', cards);
      
      if (cards.length > 0) {
        console.log('📋 First card structure:', Object.keys(cards[0]));
      }
      
      // Test 2: Try a minimal card insert
      console.log('🧪 Testing minimal card insert...');
      const testCard: Partial<QuizCard> = {
        question: 'Database test question',
        card_type: 'flashcard',
        answer: 'Test answer',
        difficulty: 1
      };
      
      const result = await this.quizService.addCard(this.quiz.id, testCard);
      console.log('✅ Card insert successful:', result);
      
      // Clean up - remove test card
      if (result.id) {
        await this.quizService.deleteQuizCard(result.id);
        console.log('🧹 Test card cleaned up');
      }
      
    } catch (error: any) {
      console.error('❌ Database test failed:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }
  }
}
