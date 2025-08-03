import { MatMenuModule } from '@angular/material/menu';
// ...existing imports and decorators...
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { QuizService, Quiz, QuizCard } from '../../../core/services/quiz.service';

// Locally extended QuizCard type for robust answer parsing
type CardWithParsed = QuizCard & { parsedAnswer?: any; parseError?: string | null };
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
    TestConfigModalComponent,
    MatMenuModule
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
  // --- Test start menu logic ---
  startLearningMode() {
    // Tanulás: 5-20 random kártya, csak flashcard, nincs határidő
    const cardCount = Math.floor(Math.random() * 16) + 5;
    const selectedCards = this.shuffleArray(this.cards).filter(card => card.card_type === 'flashcard').slice(0, cardCount);
    const config: TestConfiguration = {
      testTypes: [{ id: 'flashcard', enabled: true, name: 'Flashcard', description: 'Flashcard teszt' }],
      questionCount: cardCount,
      shuffleQuestions: true,
      showHints: true,
      timeLimit: undefined,
      allowRetry: true,
      immediateResultsForMC: false
    };
    this.startTestWithConfig(selectedCards, config);
  }

  startEasyMode() {
    // Könnyű: 5-15 kártya, egyszeri választásos, határidővel, lehet flashcard (csak 0%-osak)
    const cardCount = Math.floor(Math.random() * 11) + 5;
    let easyCards = this.cards.filter(card => {
      if (!card.id) return false;
      // Flashcard csak ha 0%-os tudás
      const successRate = this.getCardSuccessRate(card.id);
      return card.card_type === 'multiple_choice' || (card.card_type === 'flashcard' && successRate === 0);
    });
    easyCards = this.shuffleArray(easyCards).slice(0, cardCount);
    const config: TestConfiguration = {
      testTypes: [
        { id: 'multiple_choice', enabled: true, name: 'Egyszeri választás', description: 'Egyszeri választásos teszt' },
        { id: 'flashcard', enabled: true, name: 'Flashcard', description: 'Flashcard teszt' }
      ],
      questionCount: cardCount,
      shuffleQuestions: true,
      showHints: true,
      timeLimit: cardCount * 45,
      allowRetry: true,
      immediateResultsForMC: false
    };
    this.startTestWithConfig(easyCards, config);
  }

  startMediumMode() {
    // Közepes: 5-20 kártya, egyszeri/többszöri választás, határidővel, arányos idő
    const cardCount = Math.floor(Math.random() * 16) + 5;
    let mediumCards = this.cards.filter(card => String(card.card_type) === 'multiple_choice' || String(card.card_type) === 'multi_select');
    mediumCards = this.shuffleArray(mediumCards).slice(0, cardCount);
    const config: TestConfiguration = {
      testTypes: [
        { id: 'multiple_choice', enabled: true, name: 'Egyszeri választás', description: 'Egyszeri választásos teszt' },
        { id: 'multi_select', enabled: true, name: 'Többszöri választás', description: 'Többszöri választásos teszt' }
      ],
      questionCount: cardCount,
      shuffleQuestions: true,
      showHints: false,
      timeLimit: cardCount * 40,
      allowRetry: true,
      immediateResultsForMC: true
    };
    this.startTestWithConfig(mediumCards, config);
  }

  startHardMode() {
    // Nehéz: 10-30 kártya, több multi_select, kevesebb multiple_choice/írásos, arányos idő
    const cardCount = Math.floor(Math.random() * 21) + 10;
    let hardCards = this.cards.filter(card => String(card.card_type) === 'multiple_choice' || String(card.card_type) === 'multi_select' || String(card.card_type) === 'written');
    hardCards = this.shuffleArray(hardCards).slice(0, cardCount);
    // Arányos idő: written: 60s, multi_select: 45s, multiple_choice: 35s
    let timeLimit = 0;
    hardCards.forEach(card => {
      if (String(card.card_type) === 'written') timeLimit += 60;
      else if (String(card.card_type) === 'multi_select') timeLimit += 45;
      else if (String(card.card_type) === 'multiple_choice') timeLimit += 35;
    });
    const config: TestConfiguration = {
      testTypes: [
        { id: 'multiple_choice', enabled: true, name: 'Egyszeri választás', description: 'Egyszeri választásos teszt' },
        { id: 'multi_select', enabled: true, name: 'Többszöri választás', description: 'Többszöri választásos teszt' },
        { id: 'written', enabled: true, name: 'Írásos', description: 'Írásos teszt' }
      ],
      questionCount: cardCount,
      shuffleQuestions: true,
      showHints: false,
      timeLimit,
      allowRetry: false,
      immediateResultsForMC: true
    };
    this.startTestWithConfig(hardCards, config);
  }

  // Helper: get card performance (0-100)

  // Helper: shuffle array
  shuffleArray<T>(array: T[]): T[] {
    return array
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
  }

  // Helper: start test with config
  startTestWithConfig(selectedCards: QuizCard[], config: TestConfiguration) {
    // Use testService to create session and navigate
    // Feltételezve, hogy a tesztService.createTestSession(quizId, config) signature-t használ
    // Ha a selectedCards tömb kell, akkor a metódust módosítani kell, de most quizId-t adunk át
    if (selectedCards.length > 0 && selectedCards[0].quiz_id) {
      this.testService.createTestSession(selectedCards[0].quiz_id, config);
      this.router.navigate(['/quiz-manager/test-execution']);
    }
  }
  // Helper to parse correct/incorrect answers from card.answer JSON
  getParsedAnswers(card: QuizCard): { correct?: string[]; incorrect?: string[] } {
    if (card.card_type !== 'multiple_choice' || !card.answer) return {};
    try {
      const parsed = JSON.parse(card.answer);
      return {
        correct: parsed.correct || [],
        incorrect: parsed.incorrect || []
      };
    } catch {
      return {};
    }
  }
  // Locally extended QuizCard type for parsedAnswer
  // --- Add missing methods required by template ---
  goBack(): void {
    this.router.navigate(['/library']);
  }

  toggleSettings(): void {
    this.showSettings = !this.showSettings;
  }

  saveSettings(): void {
    // TODO: Implement quiz settings save logic
    this.showSettings = false;
  }

  cancelEdit(): void {
    this.showCreateCard = false;
    this.resetNewCard();
  }

  toggleAnswerType(index: number): void {
    if (this.newCard.answers[index]) {
      this.newCard.answers[index].isCorrect = !this.newCard.answers[index].isCorrect;
    }
  }

  addNewAnswer(): void {
    this.newCard.answers.push({ text: '', isCorrect: false });
  }

  deleteCard(cardId: string): void {
    this.quizService.deleteQuizCard(cardId).then(() => {
      this.cards = this.cards.filter(card => card.id !== cardId);
    });
  }

  resetNewCard(): void {
    this.newCard = {
      question: '',
      answers: [{ text: '', isCorrect: true }],
      hint: ''
    };
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByCardId(index: number, card: any): string {
    return card.id || index.toString();
  }

  removeAnswer(index: number): void {
    if (this.newCard.answers.length > 1) {
      this.newCard.answers.splice(index, 1);
    }
  }

  handleAnswerEnter(index: number, event: Event): void {
    event.preventDefault();
    if (index === this.newCard.answers.length - 1) {
      this.addNewAnswer();
      setTimeout(() => {
        const nextInput = document.querySelectorAll('.answer-input')[index + 1] as HTMLInputElement;
        if (nextInput) nextInput.focus();
      }, 50);
    }
  }

  focusFirstAnswer(): void {
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
      const isFlashcard = correctAnswers.length === 1 && incorrectAnswers.length === 0;
      const cardData: Partial<QuizCard> = {
        question: this.newCard.question.trim(),
        card_type: isFlashcard ? 'flashcard' : 'multiple_choice',
        hint: this.newCard.hint?.trim() || undefined,
        difficulty: 1
      };
      if (isFlashcard) {
        cardData.answer = correctAnswers[0];
      } else {
        cardData.answer = JSON.stringify({
          type: 'multiple_choice',
          correct: correctAnswers,
          incorrect: incorrectAnswers,
          hint: this.newCard.hint?.trim() || undefined
        });
      }
      const card = await this.quizService.addCard(this.quiz.id, cardData);
      const cardWithFlip = { ...card, isFlipped: false };
      this.cards.unshift(cardWithFlip);
      this.resetNewCard();
    } catch (err: any) {
      console.error('Hiba a kártya mentése során:', err);
      this.error = 'Hiba történt a kártya mentése során: ' + (err.message || err?.error_description || 'Ismeretlen hiba');
    }
  }

  flipCard(card: any): void {
    card.isFlipped = !card.isFlipped;
  }

  editCard(card: any): void {
    // TODO: Implementáld a szerkesztést
  }
  isOwner = false;
  showScrollTop = false;
  private scrollListener: (() => void) | null = null;

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  @ViewChild('questionEditor') questionEditor!: ElementRef;
  @ViewChild('imageInput') imageInput!: ElementRef;

  quiz: Quiz | null = null;
  cards: (QuizCard & { parsedAnswer?: any; parseError?: string | null })[] = [];
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
    // Scroll event for scroll-to-top button
    this.scrollListener = () => {
      this.showScrollTop = window.scrollY > 400;
    };
    window.addEventListener('scroll', this.scrollListener);
    // ...existing code...
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
      this.quiz = await this.quizService.getQuizById(quizId);
      const rawCards = await this.quizService.getQuizCards(quizId);
      // Csak másolt kvíznél írunk ki debug logokat
      const isCopy = this.quiz?.name?.includes('(Copy)');
      if (isCopy) {
        console.log('[QUIZ DETAILS] quiz:', this.quiz);
        console.log('[QUIZ DETAILS] rawCards:', rawCards);
      }
      this.cards = rawCards.map((card, idx) => {
        let parsedAnswer: any = null;
        let cardType = 'flashcard';
        let parseError: string | null = null;
        if (typeof card.answer === 'string' && card.answer.trim() !== '') {
          try {
            const parsed = JSON.parse(card.answer);
            if (parsed.type === 'multiple_choice') {
              cardType = 'multiple_choice';
              parsedAnswer = parsed;
            }
          } catch (e: any) {
            cardType = 'flashcard';
            parsedAnswer = null;
            parseError = `JSON.parse error: ${e.message}. Invalid answer string: ${card.answer}`;
          }
        }
        return { ...card, card_type: cardType, parsedAnswer, parseError } as CardWithParsed;
      });
      // If any card has a parseError, show it in the UI
      const firstParseErrorCard = this.cards.find(card => (card as CardWithParsed).parseError);
      if (firstParseErrorCard) {
        this.error = (firstParseErrorCard as CardWithParsed).parseError ?? null;
      }
      if (isCopy) {
        console.log('[QUIZ DETAILS] mapped cards:', this.cards);
      }
      this.cardPerformance = await this.testService.getCardPerformance(quizId);
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
        const currentUser = this.authService.user();
        this.isOwner = !!(this.quiz.user_id && currentUser && this.quiz.user_id === currentUser.id);
      }
    } catch (err: any) {
      let details = '';
      if (err) {
        details += err?.message ? `Hiba: ${err.message}\n` : '';
        details += err?.stack ? `Stack trace: ${err.stack}\n` : '';
        details += err?.response ? `Backend válasz: ${JSON.stringify(err.response)}\n` : '';
        details += err?.error_description ? `Leírás: ${err.error_description}\n` : '';
      }
      this.error = details || 'Hiba történt a kvíz betöltésekor';
    } finally {
      this.isLoading = false;
    }
  }

  // --- Utility methods and handlers ---

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
