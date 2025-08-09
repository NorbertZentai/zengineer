import { MatMenuModule } from '@angular/material/menu';
// ...existing imports and decorators...
import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { QuizService, Quiz, QuizCard } from '../../../core/services/quiz.service';
import { AiService } from '../../../core/services/ai.service';
import { NotificationService } from '../../../core/services/notification.service';

// Locally extended QuizCard type for robust answer parsing
type CardWithParsed = QuizCard & { parsedAnswer?: any; parseError?: string | null };
import { AuthService } from '../../../core/services/auth.service';
import { TestService, TestConfiguration, CardPerformance } from '../../../core/services/test.service';
import { TestConfigModalComponent } from '../test-config-modal/test-config-modal.component';
import { environment } from '../../../../environments/environment';

type QuizCardView = QuizCard & { parsedAnswer?: any; parseError?: string | null; isFlipped?: boolean };

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
    // Tanulás: 5-20 random kártya, csak flashcard logika (answer nem JSON, vagy csak egy helyes válasz van)
    const cardCount = Math.floor(Math.random() * 16) + 5;
    let selectedCards = this.shuffleArray(this.cards).filter(card => {
      if (!card.answer) return true;
      const parsed = this.getParsedAnswers(card);
      const isMultipleChoice = (parsed.correct?.length === 1) && (parsed.incorrect?.length ?? 0) >= 2;
      const isMultiSelect = (parsed.correct?.length ?? 0) >= 2 && (parsed.incorrect?.length ?? 0) >= 3;
      return !isMultipleChoice && !isMultiSelect;
    });
    if (selectedCards.length === 0) {
      selectedCards = this.shuffleArray(this.cards);
    }
    selectedCards = selectedCards.slice(0, cardCount);
    const config: TestConfiguration = {
      testTypes: [{
        id: 'flashcard',
        enabled: true,
        name: this.t('TEST.MENU.LEARNING'),
        description: this.t('TEST.TYPES.FLASHCARD_DESC')
      }],
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
    // Könnyű: 5-15 kérdés, flashcard és multiple_choice (answer-ben 1 helyes, legalább 2 rossz), multi_select csak ha legalább 2 helyes és 3 rossz
        let minCount = 5, maxCount = 15;
        // Filter cards using the same logic as isQuestionSuitable
        const isCardSuitable = (card: QuizCard): boolean => {
          if (!card || !card.card_type || !card.question || card.question.trim() === '') return false;
          if (card.card_type === 'flashcard' && (!card.answer || card.answer.trim() === '')) return false;
          if ((card.card_type === 'multiple_choice') && (!card.answer || card.answer.trim() === '')) return false;
          // Optionally, check for options array if available
          return true;
        };
        let suitableCards = this.shuffleArray(this.cards).filter(isCardSuitable);
        let cardCount = 0;
        if (suitableCards.length < minCount) {
          cardCount = suitableCards.length;
        } else {
          cardCount = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
          if (cardCount > suitableCards.length) cardCount = suitableCards.length;
        }
        let easyCards = suitableCards.slice(0, cardCount);
    // DEBUG: Log selected card IDs
    console.log('Easy test: selected card IDs:', easyCards.map(card => card.id));
    // DEBUG: Log selected card IDs
    console.log('Easy test: selected card IDs:', easyCards.map(card => card.id));
    const config: TestConfiguration = {
      testTypes: [
  { id: 'multiple_choice', enabled: true, name: this.t('TEST.TYPES.MULTIPLE_CHOICE'), description: this.t('TEST.TYPES.MULTIPLE_CHOICE_DESC') },
  { id: 'multi_select', enabled: true, name: this.t('TEST.TYPES.MULTI_SELECT'), description: this.t('TEST.TYPES.MULTI_SELECT_DESC') },
  { id: 'flashcard', enabled: true, name: this.t('TEST.TYPES.FLASHCARD'), description: this.t('TEST.TYPES.FLASHCARD_DESC') }
      ],
      questionCount: cardCount,
      shuffleQuestions: true,
      showHints: true,
      timeLimit: cardCount * 60,
      allowRetry: true,
      immediateResultsForMC: false
    };
    this.startTestWithConfig(easyCards, config);
  }

  startMediumMode() {
    // Közepes: 10-20 kérdés, csak multiple_choice (1 helyes, legalább 2 rossz) és multi_select (legalább 2 helyes, 3 rossz)
    let minCount = 10, maxCount = 20;
    let allCards = this.shuffleArray(this.cards);
    let cardCount = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
    cardCount = Math.max(minCount, Math.min(cardCount, allCards.length, maxCount));
    let multiSelectCards: QuizCard[] = [];
    let singleChoiceCards: QuizCard[] = [];
    for (const card of allCards) {
      if (!card.answer) {
        singleChoiceCards.push(card);
        continue;
      }
      const parsed = this.getParsedAnswers(card);
      if ((parsed.correct?.length ?? 0) >= 2 && (parsed.incorrect?.length ?? 0) >= 3) {
        multiSelectCards.push(card);
      } else {
        singleChoiceCards.push(card);
      }
    }
    let mediumCards: QuizCard[] = [];
    for (const card of multiSelectCards) {
      if (mediumCards.length < cardCount) mediumCards.push(card);
    }
    for (const card of singleChoiceCards) {
      if (mediumCards.length < cardCount) mediumCards.push(card);
    }
    const config: TestConfiguration = {
      testTypes: [
  { id: 'multiple_choice', enabled: true, name: this.t('TEST.TYPES.MULTIPLE_CHOICE'), description: this.t('TEST.TYPES.MULTIPLE_CHOICE_DESC') },
  { id: 'multi_select', enabled: true, name: this.t('TEST.TYPES.MULTI_SELECT'), description: this.t('TEST.TYPES.MULTI_SELECT_DESC') }
      ],
      questionCount: cardCount,
      shuffleQuestions: true,
      showHints: false,
      timeLimit: cardCount * 45,
      allowRetry: true,
      immediateResultsForMC: true
    };
    this.startTestWithConfig(mediumCards, config);
  }

  startHardMode() {
    // Nehéz: 10-30 kérdés, főleg multi_select (legalább 2 helyes, 3 rossz), kevesebb multiple_choice (1 helyes, 2 rossz), írásos kérdés nem szűrhető answer alapján
    let minCount = 10, maxCount = 30;
    let allCards = this.shuffleArray(this.cards);
    let cardCount = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
    cardCount = Math.max(minCount, Math.min(cardCount, allCards.length, maxCount));
    let multiSelectCards: QuizCard[] = [];
    let singleChoiceCards: QuizCard[] = [];
    for (const card of allCards) {
      if (!card.answer) {
        singleChoiceCards.push(card);
        continue;
      }
      const parsed = this.getParsedAnswers(card);
      if ((parsed.correct?.length ?? 0) >= 2 && (parsed.incorrect?.length ?? 0) >= 3) {
        multiSelectCards.push(card);
      } else {
        singleChoiceCards.push(card);
      }
    }
    let hardCards: QuizCard[] = [];
    for (const card of multiSelectCards) {
      if (hardCards.length < cardCount) hardCards.push(card);
    }
    for (const card of singleChoiceCards) {
      if (hardCards.length < cardCount) hardCards.push(card);
    }
    // Több multi_select, kevesebb multiple_choice
    hardCards = hardCards.sort((a, b) => {
      if (!a.answer) return 1;
      if (!b.answer) return -1;
      try {
        const ansA = JSON.parse(a.answer);
        const ansB = JSON.parse(b.answer);
        const aIsMulti = Array.isArray(ansA.correct) && ansA.correct.length >= 2 && Array.isArray(ansA.incorrect) && ansA.incorrect.length >= 3;
        const bIsMulti = Array.isArray(ansB.correct) && ansB.correct.length >= 2 && Array.isArray(ansB.incorrect) && ansB.incorrect.length >= 3;
        return aIsMulti === bIsMulti ? 0 : aIsMulti ? -1 : 1;
      } catch {
        return 1;
      }
    });
    // Arányos idő: multi_select: 40s, multiple_choice: 30s, írásos: 50s
    let timeLimit = 0;
    hardCards.forEach(card => {
      if (!card.answer) {
        timeLimit += 50;
        return;
      }
      const parsed = this.getParsedAnswers(card);
      if ((parsed.correct?.length ?? 0) >= 2 && (parsed.incorrect?.length ?? 0) >= 3) {
        timeLimit += 40;
      } else if ((parsed.correct?.length ?? 0) === 1 && (parsed.incorrect?.length ?? 0) >= 2) {
        timeLimit += 30;
      } else {
        timeLimit += 50;
      }
    });
    const config: TestConfiguration = {
      testTypes: [
  { id: 'multiple_choice', enabled: true, name: this.t('TEST.TYPES.MULTIPLE_CHOICE'), description: this.t('TEST.TYPES.MULTIPLE_CHOICE_DESC') },
  { id: 'multi_select', enabled: true, name: this.t('TEST.TYPES.MULTI_SELECT'), description: this.t('TEST.TYPES.MULTI_SELECT_DESC') },
  { id: 'written', enabled: true, name: this.t('TEST.TYPES.WRITTEN'), description: this.t('TEST.TYPES.WRITTEN_DESC') }
      ],
      questionCount: cardCount,
      shuffleQuestions: true,
      showHints: false,
      timeLimit: timeLimit,
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
  async startTestWithConfig(selectedCards: QuizCard[], config: TestConfiguration) {
    // Egységes tesztindítás: this.quiz.id, session.id, async/await
    if (!this.quiz?.id) {
      this.error = this.t('TEST.ERRORS.MISSING_QUIZ_ID');
      return;
    }
    if (selectedCards.length === 0) {
      this.error = this.t('TEST.ERRORS.NO_SELECTED_CARDS');
      return;
    }
    try {
      this.isLoading = true;
      this.error = null;
      const session = await this.testService.createTestSession(this.quiz.id, config);
      this.router.navigate(['/quiz-manager/test', session.id]);
    } catch (error: any) {
      this.error = error.message || this.t('TEST.ERRORS.START_FAILED');
    } finally {
      this.isLoading = false;
    }
  }
  // Helper to get hint from a card
  getCardHint(card: QuizCard): string | undefined {
    const parsed = this.getParsedAnswers(card);
    return parsed.hint;
  }

  // Helper to get the display answer for flashcards
  getCardAnswer(card: QuizCard): string {
    if (!card.answer) return '';
    
    // If it's a flashcard, try to parse JSON first to extract the answer
    if (card.card_type === 'flashcard') {
      try {
        const parsed = JSON.parse(card.answer);
        if (parsed.type === 'flashcard' && parsed.answer) {
          return parsed.answer;
        }
      } catch {
        // If JSON parse fails, use the raw answer
      }
      return card.answer;
    }
    
    return card.answer;
  }

  // Helper to parse correct/incorrect answers from card.answer JSON
  getParsedAnswers(card: QuizCard): { correct?: string[]; incorrect?: string[]; hint?: string } {
    if (!card.answer) return {};
    
    // Ha flashcard típus, akkor az answer lehet egyszerű string vagy JSON
    if (card.card_type === 'flashcard') {
      try {
        const parsed = JSON.parse(card.answer);
        if (parsed.type === 'flashcard') {
          return {
            correct: [parsed.answer],
            incorrect: [],
            hint: parsed.hint
          };
        }
      } catch {
        // Ha JSON parse sikertelen, egyszerű string
      }
      return {
        correct: [card.answer],
        incorrect: []
      };
    }
    
    // Ha multiple_choice típus, akkor JSON-t várunk
    if (card.card_type === 'multiple_choice') {
      try {
        const parsed = JSON.parse(card.answer);
        return {
          correct: parsed.correct || [],
          incorrect: parsed.incorrect || [],
          hint: parsed.hint
        };
      } catch {
        // Ha JSON parse sikertelen, próbáljuk flashcard-ként kezelni
        return {
          correct: [card.answer],
          incorrect: []
        };
      }
    }
    
    return {};
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
  this.notificationService.success('QUIZ_MANAGER.MESSAGES.CARD_DELETED', 'QUIZ_MANAGER.TITLE');
    });
  }

  resetNewCard(): void {
    this.newCard = {
      question: '',
      answers: [{ text: '', isCorrect: true }],
      hint: ''
    };
    // Szerkesztési állapot törlése
    this.isEditingCard = false;
    this.editingCardId = null;
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
      const hint = this.newCard.hint?.trim() || undefined;
      
      const cardData: Partial<QuizCard> = {
        question: this.newCard.question.trim(),
        difficulty: 1
      };
      
      if (isFlashcard) {
        // For flashcards, if there's a hint, store it as JSON structure
        if (hint) {
          cardData.answer = JSON.stringify({
            type: 'flashcard',
            answer: correctAnswers[0],
            hint: hint
          });
        } else {
          cardData.answer = correctAnswers[0];
        }
      } else {
        cardData.answer = JSON.stringify({
          type: 'multiple_choice',
          correct: correctAnswers,
          incorrect: incorrectAnswers,
          hint: hint
        });
      }
      
      if (this.isEditingCard && this.editingCardId) {
        // Szerkesztés esetén frissítjük a meglévő kártyát
        const updatedCard = await this.quizService.updateQuizCard(this.editingCardId, cardData);
        const cardIndex = this.cards.findIndex(c => c.id === this.editingCardId);
        if (cardIndex !== -1) {
          this.cards[cardIndex] = { ...updatedCard, isFlipped: false };
        }
        this.notificationService.success('QUIZ_MANAGER.MESSAGES.CARD_UPDATED', 'QUIZ_MANAGER.TITLE');
      } else {
        // Új kártya hozzáadása
        const card = await this.quizService.addCard(this.quiz.id, cardData);
        const cardWithFlip = { ...card, isFlipped: false };
        this.cards.unshift(cardWithFlip);
        this.notificationService.success('QUIZ_MANAGER.MESSAGES.CARD_SAVED', 'QUIZ_MANAGER.TITLE');
      }
      
      this.resetNewCard();
    } catch (err: any) {
      console.error('Hiba a kártya mentése során:', err);
      this.error = this.t('QUIZ_MANAGER.MESSAGES.CARD_SAVE_ERROR') + ': ' + (err.message || err?.error_description || 'Unknown error');
      this.notificationService.error('QUIZ_MANAGER.MESSAGES.CARD_SAVE_ERROR', 'QUIZ_MANAGER.TITLE');
    }
  }

  flipCard(card: any): void {
    card.isFlipped = !card.isFlipped;
  }

  editCard(card: any): void {
    // Betöltjük a kártya adatait a szerkesztő űrlapba
    this.isEditingCard = true;
    this.editingCardId = card.id;
    
    // Parse-oljuk a kártya adatait
    const parsed = this.getParsedAnswers(card);
    
    // Alapértelmezett szerkesztési form feltöltése
    this.newCard = {
      question: card.question || '',
      answers: [],
      hint: parsed.hint || ''
    };
    
    // Ha flashcard típus
    if (card.card_type === 'flashcard') {
      const answer = this.getCardAnswer(card);
      this.newCard.answers = [
        { text: answer, isCorrect: true }
      ];
    } 
    // Ha multiple choice típus
    else if (card.card_type === 'multiple_choice') {
      const correctAnswers = parsed.correct || [];
      const incorrectAnswers = parsed.incorrect || [];
      
      this.newCard.answers = [
        ...correctAnswers.map(text => ({ text, isCorrect: true })),
        ...incorrectAnswers.map(text => ({ text, isCorrect: false }))
      ];
      
      // Ha nincs válasz, adjunk hozzá egy üres helyes választ
      if (this.newCard.answers.length === 0) {
        this.newCard.answers.push({ text: '', isCorrect: true });
      }
    }
    
    // Görgetés a szerkesztő űrlaphoz
    this.showCreateCard = true;
    setTimeout(() => {
      const editorElement = document.querySelector('.quick-card-creator');
      if (editorElement) {
        editorElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      
      // Rich text editor tartalmának beállítása
      setTimeout(() => {
        if (this.questionEditor && this.questionEditor.nativeElement) {
          this.questionEditor.nativeElement.innerHTML = card.question || '';
          // Trigger change event to sync with newCard.question
          this.newCard.question = card.question || '';
        }
      }, 50);
    }, 100);
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
  cards: QuizCardView[] = [];
  isLoading = false;
  error: string | null = null;
  showCreateCard = false;
  showSettings = false;
  // Kártya szerkesztési állapot
  isEditingCard = false;
  editingCardId: string | null = null;
  // AI inline state
  aiTopic: string = '';
  aiLanguage: string = 'hu';
  aiCount: number = 15;
  aiDifficulty: 'easy' | 'medium' | 'hard' = 'medium';
  
  // Format tracking to prevent expression changed errors
  private formatStates: { [key: string]: boolean } = {};
  
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
    private testService: TestService,
    private ai: AiService,
    private notificationService: NotificationService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  // Simple translation helper
  private t(key: string, params?: Record<string, any>): string {
    try {
      return this.translate.instant(key, params);
    } catch {
      return key;
    }
  }

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

  async generateAiCardsForThisQuiz(difficulty?: 'easy' | 'medium' | 'hard') {
    if (difficulty) {
      this.aiDifficulty = difficulty;
    }
    if (!this.quiz?.id) return;
    try {
      this.isLoading = true;
  const topic = (this.aiTopic && this.aiTopic.trim()) ? this.aiTopic.trim() : this.buildTopicFromQuiz() || this.t('AI.DEFAULT_TOPIC');
  const cards = await this.ai.generateQuizCards({ topic, language: this.aiLanguage, numQuestions: this.aiCount, difficulty: this.aiDifficulty });
  
  // Convert string difficulty to number
  const difficultyNumber = this.aiDifficulty === 'easy' ? 1 : this.aiDifficulty === 'medium' ? 2 : 3;
  const { inserted, skipped } = await this.quizService.addCardsToQuiz(this.quiz.id, cards as any, difficultyNumber);
      const rawCards = await this.quizService.getQuizCards(this.quiz.id);
      this.cards = rawCards as any;
      const msgKey = skipped && skipped > 0
        ? 'QUIZ_MANAGER.MESSAGES.AI_CARDS_ADDED_WITH_SKIPS'
        : 'QUIZ_MANAGER.MESSAGES.AI_CARDS_ADDED';
      const params = skipped && skipped > 0 ? { inserted, skipped } : { inserted };
      this.notificationService.success(
        msgKey,
        'QUIZ_MANAGER.ACTIONS.AI_CARDS',
        { params }
      );
    } catch (e: any) {
  this.error = e?.message || this.t('QUIZ_MANAGER.MESSAGES.AI_GENERATE_ERROR');
  this.notificationService.error(
    'QUIZ_MANAGER.MESSAGES.AI_GENERATE_ERROR',
    'ERRORS.SERVER_ERROR'
  );
    } finally {
      this.isLoading = false;
    }
  }

  async startAiTestFromDetails() {
    try {
  const topic = (this.aiTopic && this.aiTopic.trim()) ? this.aiTopic.trim() : this.buildTopicFromQuiz() || this.t('AI.DEFAULT_TOPIC');
      const language = this.aiLanguage;
      const numQuestions = this.aiCount;
      const test = await this.ai.startAiTest({ topic, language, numQuestions });
      // Build config and session from returned cards
      const config: TestConfiguration = {
        testTypes: [
          { id: 'multiple_choice', enabled: true, name: this.t('TEST.TYPES.MULTIPLE_CHOICE'), description: this.t('TEST.TYPES.MULTIPLE_CHOICE_DESC') },
          { id: 'multi_select', enabled: false, name: this.t('TEST.TYPES.MULTI_SELECT'), description: this.t('TEST.TYPES.MULTI_SELECT_DESC') },
          { id: 'flashcard', enabled: false, name: this.t('TEST.TYPES.FLASHCARD'), description: this.t('TEST.TYPES.FLASHCARD_DESC') },
          { id: 'written', enabled: false, name: this.t('TEST.TYPES.WRITTEN'), description: this.t('TEST.TYPES.WRITTEN_DESC') },
        ],
        questionCount: test.cards.length,
        shuffleQuestions: true,
        showHints: true,
        timeLimit: test.cards.length * 60,
        allowRetry: true,
        immediateResultsForMC: false
      };
      const user = this.authService.currentUser;
  if (!user) throw new Error(this.translate.instant('ERRORS.NOT_LOGGED_IN'));
      const questions = test.cards.map((c: any, idx: number) => ({
        id: `ai-${Date.now()}-${idx}`,
        card_id: `ai-${idx}`,
        question: c.question,
        type: 'multiple_choice' as const,
        options: c.answers.map((a: any) => a.text),
        correct_answer: c.answers.filter((a: any) => a.isCorrect).map((a: any) => a.text).join(', '),
        hint: c.explanation || ''
      }));
      const session = {
        quiz_id: this.quiz?.id || 'ai',
        user_id: user.id,
        configuration: config,
        questions,
        current_question_index: 0,
        start_time: new Date().toISOString(),
        status: 'active',
        answers: [],
        total_questions: questions.length,
      } as any;
      const supabase = (this.testService as any).supabase;
      const { data, error } = await supabase.from('test_sessions').insert(session).select().single();
      if (error) throw error;
      const saved = { ...session, id: data.id };
      this.testService.currentSession.set(saved);
      this.router.navigate(['/quiz-manager/test', saved.id]);
      this.notificationService.success(
        'TEST.MESSAGES.AI_TEST_STARTED',
        'TEST.START_TEST',
        { params: { count: questions.length } }
      );
    } catch (e: any) {
  this.error = e?.message || this.t('TEST.MESSAGES.AI_TEST_START_ERROR');
  this.notificationService.error(
    'TEST.MESSAGES.AI_TEST_START_ERROR',
    'ERRORS.SERVER_ERROR'
  );
    }
  }

  // Összeállítjuk a témát a kvíz címéből, leírásából és kategóriáiból (tagek)
  private buildTopicFromQuiz(): string {
    if (!this.quiz) return '';
    const parts: string[] = [];
    const name = this.quiz.name?.trim();
  const description = this.quiz.description?.trim() ? this.shorten(this.quiz.description!.trim(), 160) : '';
    let tags: string[] = [];
    const rawTags: any = (this.quiz as any).tags;
    if (Array.isArray(rawTags)) {
      tags = rawTags.filter((t: any) => typeof t === 'string' && t.trim()).map((t: string) => t.trim());
    } else if (typeof rawTags === 'string' && rawTags.trim()) {
      try {
        const parsed = JSON.parse(rawTags);
        if (Array.isArray(parsed)) {
          tags = parsed.filter((t: any) => typeof t === 'string' && t.trim()).map((t: string) => t.trim());
        } else {
          tags = rawTags.split(',').map(s => s.trim()).filter(Boolean);
        }
      } catch {
        tags = rawTags.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    if (name) parts.push(name);
    if (description) parts.push(description);
  if (tags.length) parts.push(`${this.t('QUIZ_MANAGER.LABELS.TAGS_PREFIX')}: ${tags.join(', ')}`);
    return parts.join(' — ');
  }

  // Rövidíti a szöveget max hosszra, szóhatáron vág és ellipszissel zár
  private shorten(text: string, maxLen = 160): string {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLen) return normalized;
    const slice = normalized.slice(0, maxLen);
    const lastSpace = slice.lastIndexOf(' ');
    const base = lastSpace > maxLen * 0.6 ? slice.slice(0, lastSpace) : slice;
    return base.replace(/[.,;:!?-]+$/, '') + '…';
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
  // Natural height layout – no recalculation needed
    }
  }

  // --- Utility methods and handlers ---

  selectColor(color: string) {
    this.editForm.color = color;
  }

  formatDate(dateString: string): string {
    const locale = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'en-US';
    return new Date(dateString).toLocaleDateString(locale, {
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
    this.updateFormatStates();
  }

  isFormatActive(command: string): boolean {
    // Return cached state to prevent expression changed errors
    return this.formatStates[command] || false;
  }

  private updateFormatStates() {
    // Update format states safely
    setTimeout(() => {
      try {
        this.formatStates['bold'] = document.queryCommandState('bold');
        this.formatStates['italic'] = document.queryCommandState('italic');
        this.formatStates['underline'] = document.queryCommandState('underline');
        this.cdr.detectChanges();
      } catch (error) {
        // Ignore errors
      }
    }, 0);
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
    const url = prompt(this.t('QUIZ_MANAGER.LINK_PROMPT.URL'));
    if (url) {
      const text = prompt(this.t('QUIZ_MANAGER.LINK_PROMPT.TEXT')) || url;
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

  onQuestionFocus() {
    // Update format states when editor gains focus
    this.updateFormatStates();
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
  this.error = this.t('TEST.ERRORS.NO_CARDS_TO_START');
      return;
    }
    this.showTestConfig = true;
  }

  closeTestConfig(): void {
    this.showTestConfig = false;
  }

  async startTest(config: TestConfiguration): Promise<void> {
    if (!this.quiz?.id) {
  this.error = this.t('TEST.ERRORS.MISSING_QUIZ_ID');
      return;
    }

    try {
      this.isLoading = true;
      this.error = null;
      
      if (this.cards.length === 0) {
        this.error = this.t('TEST.ERRORS.QUIZ_HAS_NO_CARDS');
        return;
      }
      
      const session = await this.testService.createTestSession(this.quiz.id, config);
      
      // Navigate to test execution page
      this.router.navigate(['/quiz-manager/test', session.id]);
      
    } catch (error: any) {
      this.error = error.message || this.t('TEST.ERRORS.START_FAILED');
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

  getCardTotalAttempts(cardId: string): number {
    const performance = this.getCardPerformance(cardId);
    return performance?.total_attempts || 0;
  }

  getCardPerformanceText(cardId: string): string {
    const performance = this.getCardPerformance(cardId);
    if (!performance || performance.total_attempts === 0) {
      return this.t('QUIZ_MANAGER.PERFORMANCE.NOT_TESTED');
    }
    const successRate = this.getCardSuccessRate(cardId);
    const attempts = performance.total_attempts;
    return `${successRate}% (${performance.correct_count}/${attempts})`;
  }

  @ViewChild('cardsGrid') cardsGridRef!: ElementRef;

  ngAfterViewInit(): void {
    setTimeout(() => this.setCardHeights(), 100);
  }

  private setCardHeights() {
    if (typeof document === 'undefined') return;
    
    const cardElements = document.querySelectorAll('.card-item');
    cardElements.forEach((cardEl) => {
      const frontEl = cardEl.querySelector('.card-front') as HTMLElement;
      const backEl = cardEl.querySelector('.card-back') as HTMLElement;
      
      if (frontEl && backEl) {
        // Temporarily make both visible to measure
        const originalBackTransform = backEl.style.transform;
        backEl.style.transform = 'rotateY(0deg)';
        backEl.style.visibility = 'hidden';
        
        const frontHeight = frontEl.offsetHeight;
        const backHeight = backEl.offsetHeight;
        
        // Restore back element
        backEl.style.transform = originalBackTransform;
        backEl.style.visibility = 'visible';
        
        // Set container height to the larger of the two
        const maxHeight = Math.max(frontHeight, backHeight);
        (cardEl as HTMLElement).style.height = `${maxHeight}px`;
      }
    });
  }
}
