import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../../core/services/theme.service';

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

export interface Quiz {
  id?: string;
  name: string;
  description?: string;
  tags: string[];
  subject?: string;
  difficulty_level?: number;
  language?: string;
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
  @Input() quizData: Quiz | null = null; // Quiz teljes adatai a témajavaslat generáláshoz
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

  isGeneratingTopicSuggestion = false;

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

  constructor(private translate: TranslateService, private themeService: ThemeService) {}

  // Computed property for reactive theme checking
  get isDarkTheme(): boolean {
    return this.themeService.isDarkTheme();
  }

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

  // AI témajavaslat generálás
  async generateTopicSuggestion(): Promise<void> {
    if (!this.quizData) {
      console.warn('Quiz data not available for topic suggestion');
      return;
    }

    this.isGeneratingTopicSuggestion = true;

    try {
      const suggestion = this.createTopicSuggestion(this.quizData);
      this.configuration.topic = suggestion;
    } catch (error) {
      console.error('Error generating topic suggestion:', error);
      // Fallback alapértelmezett témajavaslat
      this.configuration.topic = this.createFallbackTopicSuggestion();
    } finally {
      this.isGeneratingTopicSuggestion = false;
    }
  }

  private createTopicSuggestion(quiz: Quiz): string {
    // Mindig új, részletes témát generálunk
    const suggestion = this.generateDetailedTopicSuggestion(quiz);
    
    // 200-500 karakter között tartjuk
    if (suggestion.length < 200) {
      return this.expandSuggestion(suggestion, quiz);
    }
    
    if (suggestion.length > 500) {
      return suggestion.substring(0, 497) + '...';
    }
    
    return suggestion;
  }

  private generateDetailedTopicSuggestion(quiz: Quiz): string {
    const parts: string[] = [];
    
    // 1. Téma meghatározás quiz neve alapján
    const topicIntro = this.createTopicIntroduction(quiz);
    parts.push(topicIntro);
    
    // 2. Részletes tartalom leírás
    const contentDescription = this.createContentDescription(quiz);
    parts.push(contentDescription);
    
    // 3. Specifikus területek és fókusz
    const focusAreas = this.createFocusAreas(quiz);
    if (focusAreas) {
      parts.push(focusAreas);
    }
    
    // 4. Szint és cél meghatározás
    const levelAndGoals = this.createLevelAndGoals(quiz);
    parts.push(levelAndGoals);
    
    return parts.join(' ');
  }

  private createTopicIntroduction(quiz: Quiz): string {
    const variations = [
      `Készíts ${quiz.name || 'általános tudás'} témakörből részletes kérdéseket`,
      `${quiz.name || 'Az adott témakör'} mélyebb megismeréséhez szükséges kérdések létrehozása`,
      `Átfogó kérdéssor ${quiz.name || 'a témakörből'} alapján`,
      `${quiz.name || 'A kiválasztott témakör'} különböző aspektusainak feltárása kérdéseken keresztül`
    ];
    
    return variations[Math.floor(Math.random() * variations.length)];
  }

  private createContentDescription(quiz: Quiz): string {
    let description = '';
    
    if (quiz.description && quiz.description.trim()) {
      // Ha van leírás, azt használjuk alapként
      const desc = quiz.description.trim();
      description = desc.length > 100 ? desc.substring(0, 100) + '...' : desc;
      description += '. A témakör további aspektusainak részletes feltárása';
    } else {
      // Ha nincs leírás, a címkék alapján generálunk
      if (quiz.tags && quiz.tags.length > 0) {
        const mainTopics = quiz.tags.slice(0, 3).join(', ');
        description = `Fókusz a következő területekre: ${mainTopics}. Elméleti alapok és gyakorlati alkalmazások egyaránt`;
      } else {
        description = 'Alapvető fogalmak, összefüggések és gyakorlati alkalmazások átfogó feldolgozása';
      }
    }
    
    return description;
  }

  private createFocusAreas(quiz: Quiz): string | null {
    if (quiz.tags && quiz.tags.length > 0) {
      const focusVariations = [
        `Hangsúlyos tématerületek: ${quiz.tags.slice(0, 4).join(', ')}`,
        `Kiemelt területek: ${quiz.tags.slice(0, 4).join(', ')} részletes feldolgozása`,
        `Specifikus fókusz: ${quiz.tags.slice(0, 4).join(', ')} gyakorlati megközelítése`
      ];
      
      return focusVariations[Math.floor(Math.random() * focusVariations.length)];
    }
    
    return null;
  }

  private createLevelAndGoals(quiz: Quiz): string {
    const level = this.determineLevelFromQuizData(quiz);
    
    const levelDescriptions = {
      'alapszintű': [
        'Alapfogalmak megértése és egyszerű összefüggések felismerése',
        'Kezdő szintű ismeretek elsajátítása és alapvető alkalmazás',
        'Elementáris tudás megszerzése és egyszerű problémák megoldása'
      ],
      'középszintű': [
        'Mélyebb összefüggések megértése és gyakorlati alkalmazás',
        'Komplex fogalmak elsajátítása és különböző területek összekapcsolása',
        'Kritikus gondolkodás fejlesztése és problémamegoldó készségek'
      ],
      'haladó': [
        'Speciális területek mélyebb megismerése és expert szintű alkalmazás',
        'Komplex problémák megoldása és innovatív megközelítések',
        'Professzionális szintű tudás és szakértői kompetenciák fejlesztése'
      ]
    };
    
    const descriptions = levelDescriptions[level] || levelDescriptions['középszintű'];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  private determineLevelFromQuizData(quiz: Quiz): 'alapszintű' | 'középszintű' | 'haladó' {
    // Leírás alapján szint meghatározás
    if (quiz.description) {
      const desc = quiz.description.toLowerCase();
      if (desc.includes('haladó') || desc.includes('expert') || desc.includes('speciális')) {
        return 'haladó';
      } else if (desc.includes('alapszint') || desc.includes('kezdő')) {
        return 'alapszintű';
      }
    }
    
    // Címkék alapján
    if (quiz.tags) {
      const advancedTags = quiz.tags.filter(tag => 
        tag.toLowerCase().includes('haladó') || 
        tag.toLowerCase().includes('speciális') ||
        tag.toLowerCase().includes('expert')
      );
      if (advancedTags.length > 0) {
        return 'haladó';
      }
      
      const basicTags = quiz.tags.filter(tag => 
        tag.toLowerCase().includes('alapok') || 
        tag.toLowerCase().includes('kezdő')
      );
      if (basicTags.length > 0) {
        return 'alapszintű';
      }
    }
    
    // Nehézségi szint alapján
    if (quiz.difficulty_level) {
      if (quiz.difficulty_level >= 4) return 'haladó';
      if (quiz.difficulty_level <= 2) return 'alapszintű';
    }
    
    return 'középszintű';
  }

  private expandSuggestion(suggestion: string, quiz: Quiz): string {
    // Ha túl rövid, kiegészítjük további részletekkel
    const extensions = [
      'A kérdések tartalmaznak fogalmi tisztázást, gyakorlati példákat és alkalmazási területeket.',
      'Minden témakör több oldalról kerül megközelítésre: elméleti háttér, gyakorlati alkalmazás és kritikus értékelés.',
      'A feldolgozás során hangsúly kerül a témák közötti összefüggésekre és interdiszciplináris kapcsolatokra.',
      'A kérdések változatos típusúak: definíciók, magyarázatok, elemzések és szintézisek egyaránt.'
    ];
    
    const randomExtension = extensions[Math.floor(Math.random() * extensions.length)];
    return suggestion + ' ' + randomExtension;
  }

  private createDetailedFallback(): string {
    const quizNamePart = this.quizName ? this.quizName.substring(0, 100) : 'általános tudás';
    
    const fallbackSuggestions = [
      `Készíts átfogó kérdéseket ${quizNamePart} témakörből. Fókuszálj az alapfogalmakra, gyakorlati alkalmazásokra és összefüggésekre. A kérdések tartalmaznak elméleti hátteret és valós példákat egyaránt.`,
      
      `${quizNamePart} részletes feldolgozása különböző megközelítésekkel. Hangsúly kerül a fogalmi tisztaságra, gyakorlati relevanciára és interdiszciplináris kapcsolatokra.`,
      
      `Komplex kérdéssor ${quizNamePart} témában. Elméleti alapok, gyakorlati alkalmazások és kritikus gondolkodás fejlesztése a célkitűzés.`
    ];
    
    return fallbackSuggestions[Math.floor(Math.random() * fallbackSuggestions.length)];
  }

  private optimizeForAI(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .trim();
  }

  private createFallbackTopicSuggestion(): string {
    return this.createDetailedFallback();
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
