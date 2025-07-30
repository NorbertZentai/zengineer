import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { QuizService, Quiz, QuizCard } from '../../../core/services/quiz.service';
import { AuthService } from '../../../core/services/auth.service';
import { TestService, TestConfiguration, CardPerformance } from '../../../core/services/test.service';
import { TestConfigModalComponent } from '../test-config-modal/test-config-modal.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-quiz-details',
  templateUrl: './quiz-details.component.html',
  styleUrls: ['./quiz-details.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatIconModule, 
    MatButtonModule,
    TranslateModule,
    TestConfigModalComponent
  ],
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
  @ViewChild('questionEditor') questionEditor!: ElementRef;
  @ViewChild('imageInput') imageInput!: ElementRef;

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
  
  // Test-related properties
  showTestConfig = false;
  cardPerformance: CardPerformance[] = [];
  
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
    private authService: AuthService,
    private testService: TestService
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
      
      // Kártyák teljesítményének betöltése
      this.cardPerformance = await this.testService.getCardPerformance(quizId);
      
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

      // ...existing code...
      
      const card = await this.quizService.addCard(this.quiz.id, cardData);
      
      // Hozzáadjuk a flip állapotot az UI-hoz
      const cardWithFlip = { ...card, isFlipped: false };
      this.cards.unshift(cardWithFlip);
      
      this.resetNewCard();
      // ...existing code...
      
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
    // ...existing code...
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
    // ...existing code...
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
    // ...existing code...
    
    if (!this.quiz?.id) {
      console.error('❌ No quiz loaded');
      return;
    }
    
    try {
      // Test 1: Try to query existing cards
      // ...existing code...
      const cards = await this.quizService.getQuizCards(this.quiz.id);
      // ...existing code...
      
      if (cards.length > 0) {
        // ...existing code...
      }
      
      // Test 2: Try a minimal card insert
      // ...existing code...
      const testCard: Partial<QuizCard> = {
        question: 'Database test question',
        card_type: 'flashcard',
        answer: 'Test answer',
        difficulty: 1
      };
      
      const result = await this.quizService.addCard(this.quiz.id, testCard);
      // ...existing code...
      
      // Clean up - remove test card
      if (result.id) {
        await this.quizService.deleteQuizCard(result.id);
        // ...existing code...
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

  // Rich text editor methods
  formatText(command: string) {
    document.execCommand(command, false, undefined);
    if (this.questionEditor) {
      this.questionEditor.nativeElement.focus();
    }
  }

  isFormatActive(command: string): boolean {
    return document.queryCommandState(command);
  }

  insertImage() {
    if (this.imageInput) {
      this.imageInput.nativeElement.click();
    }
  }

  onImageSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = `<img src="${e.target.result}" style="max-width: 100%; height: auto; margin: 10px 0;" alt="Inserted image">`;
        this.insertHtmlAtCursor(img);
      };
      reader.readAsDataURL(file);
    }
  }

  insertLink() {
    const url = prompt('Add meg a link URL-jét:');
    if (url) {
      const text = prompt('Add meg a link szövegét:') || url;
      const link = `<a href="${url}" target="_blank">${text}</a>`;
      this.insertHtmlAtCursor(link);
    }
  }

  private insertHtmlAtCursor(html: string) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const div = document.createElement('div');
      div.innerHTML = html;
      const fragment = document.createDocumentFragment();
      let node;
      while ((node = div.firstChild)) {
        fragment.appendChild(node);
      }
      range.insertNode(fragment);
    }
  }

  onQuestionChange(event: any) {
    this.newCard.question = event.target.innerHTML;
  }

  onQuestionBlur() {
    // Clean up empty tags and normalize content
    this.newCard.question = this.cleanupHtml(this.newCard.question);
  }

  private cleanupHtml(html: string): string {
    // Remove empty tags and normalize whitespace
    return html
      .replace(/<[^>]*>(\s*)<\/[^>]*>/g, '') // Remove empty tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Test-related methods
  openTestConfig(): void {
    if (this.cards.length === 0) {
      this.error = 'Nem lehet tesztet indítani, ha nincsenek kártyák!';
      return;
    }
    this.showTestConfig = true;
  }

  closeTestConfig(): void {
    this.showTestConfig = false;
  }

  async startTest(config: TestConfiguration): Promise<void> {
    if (!this.quiz?.id) {
      this.error = 'Kvíz azonosító hiányzik!';
      return;
    }

    try {
      this.isLoading = true;
      this.error = null;
      
      if (this.cards.length === 0) {
        this.error = 'A kvízhez nincsenek kártyák. Adjon hozzá kártyákat a teszt indításához.';
        return;
      }
      
      const session = await this.testService.createTestSession(this.quiz.id, config);
      
      // Navigate to test execution page
      this.router.navigate(['/quiz-manager/test', session.id]);
      
    } catch (error: any) {
      this.error = error.message || 'Hiba történt a teszt indításakor';
    } finally {
      this.isLoading = false;
      this.showTestConfig = false;
    }
  }

  // Card performance methods
  getCardPerformance(cardId: string): CardPerformance | null {
    return this.cardPerformance.find(p => p.card_id === cardId) || null;
  }

  getCardSuccessRate(cardId: string): number {
    const performance = this.getCardPerformance(cardId);
    if (!performance || performance.total_attempts === 0) return 0;
    return Math.round((performance.correct_count / performance.total_attempts) * 100);
  }

  getCardPerformanceClass(cardId: string): string {
    const successRate = this.getCardSuccessRate(cardId);
    if (successRate >= 80) return 'excellent';
    if (successRate >= 60) return 'good';
    if (successRate > 0) return 'needs-improvement';
    return 'untested';
  }

  getCardPerformanceIcon(cardId: string): string {
    const successRate = this.getCardSuccessRate(cardId);
    if (successRate >= 80) return 'emoji_events';
    if (successRate >= 60) return 'thumb_up';
    if (successRate > 0) return 'trending_up';
    return 'help_outline';
  }
}
