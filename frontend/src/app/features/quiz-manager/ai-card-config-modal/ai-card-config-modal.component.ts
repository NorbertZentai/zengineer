import { Component, EventEmitter, Input, Output, HostListener, OnDestroy, ViewEncapsulation, AfterViewInit, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ThemeService } from '../../../core/services/theme.service';

export interface AiCardConfiguration {
  cardCount: number;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  correctAnswers: number;
  wrongAnswers: number;
  language: string;
  includeExplanations: boolean;
  questionTypes: string[]; // Többszörös kiválasztás
  adaptiveTypeSelection: boolean; // Automatikus típus kiválasztás
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

export interface QuestionTypeConfig {
  value: string;
  labelKey: string;
  icon: string;
  description: string;
  category: string;
  examples: QuestionExample[]; // AI példák minden típushoz
}

export interface QuestionExample {
  subject: string; // Tantárgy kontextus
  question: string; // Példa kérdés
  format: string; // Válasz formátum
  instruction: string; // AI instrukció
}

export interface QuestionTypeGroup {
  title: string;
  description: string;
  types: QuestionTypeConfig[];
  defaultActive: boolean;
}

export interface TopicCategory {
  name: string;
  keywords: string[];
  subjects: string[];
  tags: string[];
  questionTypes: string[];
}

@Component({
  selector: 'app-ai-card-config-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TranslateModule],
  templateUrl: './ai-card-config-modal.component.html',
  styleUrls: ['./ai-card-config-modal.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('slideToggle', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('200ms ease-in', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-out', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]
})
export class AiCardConfigModalComponent implements OnDestroy, AfterViewInit {
  @Input() quizId: string = '';
  @Input() quizName: string = '';
  @Input() set quizData(data: Quiz | null) {
    this._quizData = data;
    // Quiz adatok változásakor frissítjük a kérdéstípus csoportokat
    this.updateQuestionTypeGroups();
  }
  get quizData(): Quiz | null {
    return this._quizData;
  }
  private _quizData: Quiz | null = null;

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
    questionTypes: [], // Üres inicializálás, a konstruktor tölti fel
    adaptiveTypeSelection: true
  };

  isGeneratingTopicSuggestion = false;

  // Custom language dropdown state
  isLanguageDropdownOpen = false;
  
  // Language options with Hungarian labels
  languageOptions = [
    { value: 'hu', label: 'Magyar' },
    { value: 'en', label: 'English' }
  ];

  // Bővített kérdéstípus katalógus
  allQuestionTypes: QuestionTypeConfig[] = [
    // Alapvető típusok
    { 
      value: 'multiple_choice', 
      labelKey: 'AI.QUESTION_TYPES.MULTIPLE_CHOICE', 
      icon: 'radio_button_checked', 
      description: 'Több választási lehetőség közül egy helyes', 
      category: 'basic',
      examples: [
        {
          subject: 'Matematika',
          question: 'Mennyi 15 × 8?',
          format: 'A) 120  B) 130  C) 140  D) 150',
          instruction: 'Készíts többválasztós kérdést 4 opcióval, ahol csak egy helyes válasz van. Adj meg A), B), C), D) jelölésekkel.'
        },
        {
          subject: 'Történelem',
          question: 'Melyik évben tört ki a második világháború?',
          format: 'A) 1938  B) 1939  C) 1940  D) 1941',
          instruction: 'Történelmi eseményekről készíts többválasztós kérdést konkrét évszámokkal vagy adatokkal.'
        }
      ]
    },
    { 
      value: 'single_choice', 
      labelKey: 'AI.QUESTION_TYPES.SINGLE_CHOICE', 
      icon: 'check_circle', 
      description: '2-3 egyszerű opció közül választás', 
      category: 'basic',
      examples: [
        {
          subject: 'Nyelvtan',
          question: 'A "futott" szó múlt idejű vagy jelen idejű?',
          format: 'A) Múlt idejű  B) Jelen idejű',
          instruction: 'Készíts egyszerű, 2 opciós kérdést egyértelmű válaszokkal.'
        }
      ]
    },
    { 
      value: 'fill_in_blank', 
      labelKey: 'AI.QUESTION_TYPES.FILL_IN_BLANK', 
      icon: 'edit', 
      description: 'Hiányzó szövegrész kiegészítése', 
      category: 'basic',
      examples: [
        {
          subject: 'Nyelvtan',
          question: 'A _____ főváros Budapest.',
          format: 'Magyarország',
          instruction: 'Készíts kiegészítendő mondatot, ahol a hiányzó rész egyértelmű és konkrét.'
        },
        {
          subject: 'Matematika', 
          question: '5 + 3 = _____',
          format: '8',
          instruction: 'Matematikai egyenletek esetén a hiányzó számot vagy eredményt kell kiegészíteni.'
        }
      ]
    },
    
    // Szöveges típusok
    { 
      value: 'short_answer', 
      labelKey: 'AI.QUESTION_TYPES.SHORT_ANSWER', 
      icon: 'short_text', 
      description: 'Rövid, 1-2 mondatos válasz', 
      category: 'textual',
      examples: [
        {
          subject: 'Történelem',
          question: 'Miért tört ki az első világháború?',
          format: 'Az első világháború közvetlen kiváltó oka Ferenc Ferdinánd főherceg meggyilkolása volt 1914-ben.',
          instruction: 'Készíts kérdést, amelyre 1-2 mondatos, tömör válasz adható. Kerüld a túl bonyolult kifejtést.'
        }
      ]
    },
    { 
      value: 'definition', 
      labelKey: 'AI.QUESTION_TYPES.DEFINITION', 
      icon: 'library_books', 
      description: 'Fogalom vagy terminus meghatározása', 
      category: 'textual',
      examples: [
        {
          subject: 'Biológia',
          question: 'Mit jelent a fotoszintézis?',
          format: 'A fotoszintézis az a folyamat, amelynek során a növények fény segítségével szén-dioxidból és vízből cukrot állítanak elő.',
          instruction: 'Kérj pontos definíciót szakszavakra vagy fogalmakra. A válasz legyen precíz és tudományos.'
        }
      ]
    },
    { 
      value: 'explanation', 
      labelKey: 'AI.QUESTION_TYPES.EXPLANATION', 
      icon: 'description', 
      description: 'Részletes kifejtés vagy magyarázat', 
      category: 'textual',
      examples: [
        {
          subject: 'Fizika',
          question: 'Magyarázd el, hogyan működik a gravitáció!',
          format: 'A gravitáció egy alapvető kölcsönhatás, amely minden tömegű objektum között fellép. Newton szerint...',
          instruction: 'Kérj részletes magyarázatot folyamatokra vagy jelenségekre. A válasz lehet 3-5 mondatos.'
        }
      ]
    },
    { 
      value: 'essay_question', 
      labelKey: 'AI.QUESTION_TYPES.ESSAY', 
      icon: 'article', 
      description: 'Hosszabb esszé vagy kifejtős válasz', 
      category: 'textual',
      examples: [
        {
          subject: 'Irodalom',
          question: 'Elemezd Petőfi Sándor költészetének főbb jellemzőit!',
          format: 'Petőfi költészete több szempontból is egyedülálló a magyar irodalomban. Először is...',
          instruction: 'Készíts komplex kérdést, amely hosszabb kifejtést igényel. Több aspektust is érintsen.'
        }
      ]
    },

    // Matematikai/logikai típusok
    { 
      value: 'calculation', 
      labelKey: 'AI.QUESTION_TYPES.CALCULATION', 
      icon: 'calculate', 
      description: 'Számítás vagy képlet alkalmazás', 
      category: 'mathematical',
      examples: [
        {
          subject: 'Matematika',
          question: 'Számítsd ki: (3 + 5) × 4 - 12',
          format: '20',
          instruction: 'Készíts számítási feladatot konkrét számokkal. A válasz legyen pontos érték.'
        },
        {
          subject: 'Fizika',
          question: 'Számítsd ki a sebesség ha s = 100m, t = 10s! (v = s/t)',
          format: '10 m/s',
          instruction: 'Fizikai képletek alkalmazása konkrét értékekkel. Add meg a mértékegységet is.'
        }
      ]
    },
    { 
      value: 'problem_solving', 
      labelKey: 'AI.QUESTION_TYPES.PROBLEM_SOLVING', 
      icon: 'psychology', 
      description: 'Szöveges matematikai feladat', 
      category: 'mathematical',
      examples: [
        {
          subject: 'Matematika',
          question: 'Egy kertben 120 fa van. Ha ezek 30%-a almafa, hány almafa van a kertben?',
          format: '36 almafa',
          instruction: 'Készíts gyakorlati szöveges feladatot, amely több lépésben oldható meg.'
        }
      ]
    },
    { 
      value: 'step_by_step', 
      labelKey: 'AI.QUESTION_TYPES.STEP_BY_STEP', 
      icon: 'list_alt', 
      description: 'Lépésenkénti megoldás bemutatása', 
      category: 'mathematical',
      examples: [
        {
          subject: 'Matematika',
          question: 'Oldd meg lépésenként: 2x + 5 = 13',
          format: '1. lépés: 2x = 13 - 5\n2. lépés: 2x = 8\n3. lépés: x = 4',
          instruction: 'Kérj lépésenkénti megoldást, ahol minden lépést külön magyarázni kell.'
        }
      ]
    },
    { 
      value: 'formula_derivation', 
      labelKey: 'AI.QUESTION_TYPES.FORMULA_DERIVATION', 
      icon: 'functions', 
      description: 'Képlet levezetése vagy bizonyítás', 
      category: 'mathematical',
      examples: [
        {
          subject: 'Matematika',
          question: 'Vezetsd le a másodfokú egyenlet megoldóképletét!',
          format: 'ax² + bx + c = 0 esetén x = (-b ± √(b²-4ac)) / 2a',
          instruction: 'Kérj képlet levezetést matematikai bizonyítással és magyarázattal.'
        }
      ]
    },
    
    // Informatikai/kódolás típusok
    { 
      value: 'code_completion', 
      labelKey: 'AI.QUESTION_TYPES.CODE_COMPLETION', 
      icon: 'code', 
      description: 'Kód kiegészítése vagy befejezése', 
      category: 'coding',
      examples: [
        {
          subject: 'JavaScript',
          question: 'Egészítsd ki a kódot:\nfunction calculateSum(a, b) {\n  return ____;\n}',
          format: 'a + b',
          instruction: 'Adj hiányos kódot, amelyet kiegészíteni kell. A hiányzó rész legyen egyértelmű.'
        }
      ]
    },
    { 
      value: 'debug_code', 
      labelKey: 'AI.QUESTION_TYPES.DEBUG_CODE', 
      icon: 'bug_report', 
      description: 'Hibakeresés és javítás kódban', 
      category: 'coding',
      examples: [
        {
          subject: 'Python',
          question: 'Mi a hiba ebben a kódban?\nfor i in range(5)\n    print(i)',
          format: 'Hiányzik a kettőspont (:) a for ciklus végéről',
          instruction: 'Adj hibás kódot és kérd a hiba azonosítását és javítását.'
        }
      ]
    },
    { 
      value: 'algorithm_design', 
      labelKey: 'AI.QUESTION_TYPES.ALGORITHM_DESIGN', 
      icon: 'account_tree', 
      description: 'Algoritmus tervezése vagy optimalizálása', 
      category: 'coding',
      examples: [
        {
          subject: 'Algoritmusok',
          question: 'Tervezz algoritmust, amely megkeresi a legnagyobb elemet egy tömbben!',
          format: '1. Kezdd az első elemmel\n2. Hasonlítsd össze minden következő elemmel\n3. Ha nagyobb, frissítsd a maximumot',
          instruction: 'Kérj algoritmus tervezést lépésenkénti leírással vagy pszeudokóddal.'
        }
      ]
    },
    { 
      value: 'code_output', 
      labelKey: 'AI.QUESTION_TYPES.CODE_OUTPUT', 
      icon: 'terminal', 
      description: 'Kód futási eredményének meghatározása', 
      category: 'coding',
      examples: [
        {
          subject: 'JavaScript',
          question: 'Mi lesz a kimenet?\nconsole.log(2 + "3");',
          format: '"23"',
          instruction: 'Adj kódot és kérd a futási eredmény meghatározását. Magyarázd a típuskonverziót is.'
        }
      ]
    },
    
    // Vizuális/interaktív típusok
    { 
      value: 'sequence_order', 
      labelKey: 'AI.QUESTION_TYPES.SEQUENCE_ORDER', 
      icon: 'reorder', 
      description: 'Elemek sorba rendezése', 
      category: 'interactive',
      examples: [
        {
          subject: 'Történelem',
          question: 'Rendezd időrendi sorrendbe: Trianon, világháború vége, forradalom, tanácsköztársaság',
          format: '1. világháború vége 2. forradalom 3. tanácsköztársaság 4. Trianon',
          instruction: 'Adj keverten felsorolt elemeket, amelyeket logikai vagy időrendi sorrendbe kell rendezni.'
        }
      ]
    },
    { 
      value: 'matching_pairs', 
      labelKey: 'AI.QUESTION_TYPES.MATCHING_PAIRS', 
      icon: 'compare_arrows', 
      description: 'Elemek párosítása egymással', 
      category: 'interactive',
      examples: [
        {
          subject: 'Biológia',
          question: 'Párosítsd az organellumokat a funkcióikkal:\n1. Mitokondrium\n2. Riboszóma\na) Fehérjeszintézis\nb) Energiatermelés',
          format: '1-b, 2-a',
          instruction: 'Adj két listát (fogalmak és magyarázatok), amelyeket össze kell párosítani.'
        }
      ]
    },
    { 
      value: 'categorization', 
      labelKey: 'AI.QUESTION_TYPES.CATEGORIZATION', 
      icon: 'category', 
      description: 'Elemek kategóriákba sorolása', 
      category: 'interactive',
      examples: [
        {
          subject: 'Kémia',
          question: 'Sorold be a következőket sav vagy bázis kategóriába: HCl, NaOH, H2SO4, KOH',
          format: 'Savak: HCl, H2SO4; Bázisok: NaOH, KOH',
          instruction: 'Adj elemeket és kategóriákat, ahová be kell sorolni őket.'
        }
      ]
    },
    { 
      value: 'diagram_analysis', 
      labelKey: 'AI.QUESTION_TYPES.DIAGRAM_ANALYSIS', 
      icon: 'analytics', 
      description: 'Ábra vagy diagram értelmezése', 
      category: 'interactive',
      examples: [
        {
          subject: 'Biológia',
          question: '[Sejtábra] Milyen típusú sejt látható az ábrán és miért?',
          format: 'Növényi sejt, mert látható a sejtfal, chloroplasztiszok és nagy vakuólum',
          instruction: 'Adj ábrát vagy diagramot és kérj értelmezést, elemzést vagy következtetést.'
        }
      ]
    }
  ];

  // Témakör kategóriák
  topicCategories: TopicCategory[] = [
    {
      name: 'MATHEMATICS',
      keywords: ['matematika', 'matek', 'számtan', 'algebra', 'geometria', 'statisztika'],
      subjects: ['mathematics', 'math', 'számtan', 'matematika'],
      tags: ['egyenlet', 'függvény', 'szám', 'képlet', 'számítás', 'geometria'],
      questionTypes: ['multiple_choice', 'calculation', 'problem_solving', 'step_by_step', 'formula_derivation']
    },
    {
      name: 'PHYSICS_CHEMISTRY',
      keywords: ['fizika', 'kémia', 'természettudomány', 'kísérlet'],
      subjects: ['physics', 'chemistry', 'fizika', 'kémia'],
      tags: ['törvény', 'kísérlet', 'molekula', 'atom', 'energia', 'reakció'],
      questionTypes: ['multiple_choice', 'calculation', 'formula_derivation', 'problem_solving', 'diagram_analysis']
    },
    {
      name: 'COMPUTER_SCIENCE',
      keywords: ['informatika', 'programozás', 'kódolás', 'szoftver', 'algoritmus'],
      subjects: ['computer science', 'programming', 'IT', 'informatika'],
      tags: ['algorithm', 'code', 'javascript', 'python', 'programming', 'software'],
      questionTypes: ['multiple_choice', 'code_completion', 'debug_code', 'algorithm_design', 'code_output']
    },
    {
      name: 'HUMANITIES',
      keywords: ['történelem', 'irodalom', 'filozófia', 'társadalom', 'kultúra'],
      subjects: ['history', 'literature', 'philosophy', 'történelem', 'irodalom'],
      tags: ['század', 'író', 'mű', 'esemény', 'személyiség', 'korszak'],
      questionTypes: ['multiple_choice', 'short_answer', 'essay_question', 'sequence_order', 'matching_pairs']
    },
    {
      name: 'LANGUAGE_LEARNING',
      keywords: ['angol', 'német', 'nyelvtanulás', 'grammar', 'nyelvtan'],
      subjects: ['english', 'german', 'language', 'nyelvtan', 'idegen nyelv'],
      tags: ['vocabulary', 'grammar', 'szókincs', 'nyelvtan', 'fordítás'],
      questionTypes: ['fill_in_blank', 'definition', 'matching_pairs', 'multiple_choice', 'short_answer']
    },
    {
      name: 'NATURAL_SCIENCES',
      keywords: ['biológia', 'földrajz', 'környezettudomány', 'természet'],
      subjects: ['biology', 'geography', 'environmental', 'biológia'],
      tags: ['sejt', 'állat', 'növény', 'ökoszisztéma', 'földrajz', 'klíma'],
      questionTypes: ['multiple_choice', 'diagram_analysis', 'categorization', 'short_answer', 'explanation']
    }
  ];

  difficultyOptions = [
    { value: 'easy' as const, labelKey: 'DIFFICULTY_LEVEL.EASY', icon: 'sentiment_satisfied' },
    { value: 'medium' as const, labelKey: 'DIFFICULTY_LEVEL.MEDIUM', icon: 'sentiment_neutral' },
    { value: 'hard' as const, labelKey: 'DIFFICULTY_LEVEL.HARD', icon: 'sentiment_very_dissatisfied' }
  ];

  // Aktuális kérdéstípus csoportok
  questionTypeGroups: QuestionTypeGroup[] = [];
  
  // Dropdown állapot
  // Kiszámított kérdéstípus listák (cache-elt)
  recommendedAndBasicTypesList: QuestionTypeConfig[] = [];
  additionalTypesList: QuestionTypeConfig[] = [];

  // Dropdown állapotok kezelése
  isRecommendedDropdownOpen = false;
  isAdditionalDropdownOpen = false;

  constructor(
    private translate: TranslateService, 
    private themeService: ThemeService,
    private elementRef: ElementRef,
    private renderer: Renderer2
  ) {
    // Biztosítjuk, hogy a configuration.questionTypes inicializálva legyen
    if (!this.configuration.questionTypes) {
      this.configuration.questionTypes = [];
    }
    
    // Body scroll letiltása modal megnyitásakor
    document.body.classList.add('modal-open');
    
    // Kérdéstípus listák kiszámítása
    this.calculateQuestionTypeLists();
    
    this.updateQuestionTypeGroups();
    // Ajánlott típusok alapértelmezett kiválasztása
    this.initializeRecommendedTypes();
  }

  private calculateQuestionTypeLists(): void {
    // Ajánlott és alapvető típusok
    this.recommendedAndBasicTypesList = this.allQuestionTypes.filter(type => 
      type.category === 'basic' || type.category === 'interactive'
    );

    // További típusok
    this.additionalTypesList = this.allQuestionTypes.filter(type => 
      type.category !== 'basic' && type.category !== 'interactive'
    );
  }  private initializeRecommendedTypes(): void {
    // Ajánlott típusok automatikus kiválasztása
    if (this.recommendedAndBasicTypesList.length > 0) {
      this.configuration.questionTypes = this.recommendedAndBasicTypesList.map(type => type.value);
    } else {
      // Fallback ha nincs ajánlott típus
      this.configuration.questionTypes = ['multiple_choice'];
    }
  }

  // Computed property for reactive theme checking
  get isDarkTheme(): boolean {
    return this.themeService.isDarkTheme();
  }

  // Quiz adatok változásakor frissíti a kérdéstípus csoportokat
  updateQuestionTypeGroups(): void {
    if (this.quizData && this.configuration.adaptiveTypeSelection) {
      this.questionTypeGroups = this.getIntelligentQuestionTypeGroups(this.quizData);
      // Automatikus kiválasztás frissítése
      this.updateSelectedQuestionTypes();
    } else {
      // Alapértelmezett csoportok
      this.questionTypeGroups = this.getDefaultQuestionTypeGroups();
    }
  }

  // Intelligens kérdéstípus csoportok generálása
  private getIntelligentQuestionTypeGroups(quiz: Quiz): QuestionTypeGroup[] {
    const detectedCategories = this.detectTopicCategories(quiz);
    const recommendedTypes = this.getRecommendedQuestionTypes(detectedCategories);
    const additionalTypes = this.allQuestionTypes.filter(type => 
      !recommendedTypes.some(rec => rec.value === type.value)
    );

    return [
      {
        title: 'Ajánlott kérdéstípusok',
        description: `Az Ön témájához (${quiz.name}) leginkább illeszkedő típusok`,
        types: recommendedTypes,
        defaultActive: true
      },
      {
        title: 'További lehetőségek',
        description: 'Opcionális kérdéstípusok változatosságért',
        types: additionalTypes,
        defaultActive: false
      }
    ];
  }

  // Témakategóriák detektálása
  private detectTopicCategories(quiz: Quiz): TopicCategory[] {
    const matches: { category: TopicCategory, score: number }[] = [];

    this.topicCategories.forEach(category => {
      let score = 0;

      // Quiz név ellenőrzése (súly: 3)
      if (quiz.name) {
        const nameScore = category.keywords.filter(keyword => 
          quiz.name!.toLowerCase().includes(keyword.toLowerCase())
        ).length * 3;
        score += nameScore;
      }

      // Leírás ellenőrzése (súly: 2)
      if (quiz.description) {
        const descScore = category.keywords.filter(keyword => 
          quiz.description!.toLowerCase().includes(keyword.toLowerCase())
        ).length * 2;
        score += descScore;
      }

      // Subject mező ellenőrzése (súly: 4)
      if (quiz.subject) {
        const subjectScore = category.subjects.filter(subject => 
          quiz.subject!.toLowerCase().includes(subject.toLowerCase())
        ).length * 4;
        score += subjectScore;
      }

      // Címkék ellenőrzése (súly: 2)
      if (quiz.tags && quiz.tags.length > 0) {
        const tagScore = quiz.tags.filter(tag => 
          category.tags.some(catTag => 
            tag.toLowerCase().includes(catTag.toLowerCase()) ||
            catTag.toLowerCase().includes(tag.toLowerCase())
          )
        ).length * 2;
        score += tagScore;
      }

      if (score >= 2) {
        matches.push({ category, score });
      }
    });

    // Pontszám alapján rendezés és visszaadás
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 2) // Maximum 2 kategória
      .map(match => match.category);
  }

  // Ajánlott kérdéstípusok lekérése
  private getRecommendedQuestionTypes(categories: TopicCategory[]): QuestionTypeConfig[] {
    const recommendedTypeValues = new Set<string>();

    // Minden kategóriából vegyük a típusokat
    categories.forEach(category => {
      category.questionTypes.forEach(type => recommendedTypeValues.add(type));
    });

    // Ha nincs specifikus kategória, alapértelmezett univerzális típusok
    if (recommendedTypeValues.size === 0) {
      recommendedTypeValues.add('multiple_choice');
      recommendedTypeValues.add('short_answer');
      recommendedTypeValues.add('fill_in_blank');
    }

    return this.allQuestionTypes.filter(type => recommendedTypeValues.has(type.value));
  }

  // Alapértelmezett csoportok (amikor nincs quiz adat)
  private getDefaultQuestionTypeGroups(): QuestionTypeGroup[] {
    const basicTypes = this.allQuestionTypes.filter(type => type.category === 'basic');
    const otherTypes = this.allQuestionTypes.filter(type => type.category !== 'basic');

    return [
      {
        title: 'Alapvető kérdéstípusok',
        description: 'Általánosan használható kérdésformák',
        types: basicTypes,
        defaultActive: true
      },
      {
        title: 'Speciális típusok',
        description: 'Témakör-specifikus kérdésformák',
        types: otherTypes,
        defaultActive: false
      }
    ];
  }

  // Automatikus típus kiválasztás frissítése
  private updateSelectedQuestionTypes(): void {
    if (this.questionTypeGroups.length > 0) {
      const recommendedGroup = this.questionTypeGroups.find(group => group.defaultActive);
      if (recommendedGroup && recommendedGroup.types.length > 0) {
        // Kombináljuk az ajánlott típusokat az alapvető típusokkal
        const basicTypes = this.allQuestionTypes.filter(type => type.category === 'basic');
        const recommendedAndBasic = [...recommendedGroup.types];
        
        // Hozzáadjuk az alapvető típusokat, ha még nincsenek benne
        basicTypes.forEach(basicType => {
          if (!recommendedAndBasic.some(type => type.value === basicType.value)) {
            recommendedAndBasic.push(basicType);
          }
        });
        
        // Az összes ajánlott és alapvető típust kiválasztjuk (maximum 5)
        this.configuration.questionTypes = recommendedAndBasic
          .slice(0, 5)
          .map(type => type.value);
      }
    } else {
      // Fallback: alapvető típusokat választjuk ki
      const basicTypes = this.allQuestionTypes.filter(type => type.category === 'basic');
      this.configuration.questionTypes = basicTypes.map(type => type.value);
    }
  }

  onClose(): void {
    // Body scroll visszaállítása modal bezárásakor
    document.body.classList.remove('modal-open');
    this.close.emit();
  }

  // Külső kattintásra dropdown bezárása
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Ha a kattintás nem a dropdown elemeken belül történt, bezárjuk őket
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown-question-types')) {
      this.closeDropdowns();
    }
    // Language dropdown bezárása is
    if (!target.closest('.custom-language-dropdown')) {
      this.isLanguageDropdownOpen = false;
    }
  }

  onGenerateCards(): void {
    if (this.isConfigurationValid()) {
      // Konfigurációt bővítjük ki a kiválasztott típusok példáival
      const enhancedConfig = this.enhanceConfigurationWithExamples(this.configuration);
      this.generateCards.emit(enhancedConfig);
    }
  }

  // Konfiguráció kiegészítése AI példákkal
  private enhanceConfigurationWithExamples(config: AiCardConfiguration): AiCardConfiguration {
    // Kiválasztott típusok példáinak összegyűjtése
    const selectedTypeExamples = config.questionTypes.map(typeValue => {
      const typeConfig = this.allQuestionTypes.find(t => t.value === typeValue);
      return {
        type: typeValue,
        examples: typeConfig?.examples || [],
        instruction: this.generateTypeInstructions(typeValue, typeConfig?.examples || [])
      };
    });

    // Bővített konfiguráció az AI számára
    return {
      ...config,
      typeExamples: selectedTypeExamples,
      detailedInstructions: this.generateDetailedInstructions(selectedTypeExamples)
    } as AiCardConfiguration & { typeExamples: any[], detailedInstructions: string };
  }

  // Típus-specifikus instrukciók generálása
  private generateTypeInstructions(typeValue: string, examples: QuestionExample[]): string {
    if (examples.length === 0) return '';

    const baseInstruction = examples[0].instruction;
    const formats = examples.map(ex => `"${ex.question}" → "${ex.format}"`).join(', ');
    
    return `${baseInstruction} Példák: ${formats}`;
  }

  // Részletes AI instrukciók generálása
  private generateDetailedInstructions(typeExamples: any[]): string {
    const instructions: string[] = [];
    
    instructions.push('KÉRDÉSTÍPUS FORMÁTUMOK ÉS PÉLDÁK:');
    
    typeExamples.forEach(({ type, examples }) => {
      const typeConfig = this.allQuestionTypes.find(t => t.value === type);
      if (typeConfig && examples.length > 0) {
        instructions.push(`\n${typeConfig.description.toUpperCase()}:`);
        examples.forEach((example: QuestionExample, index: number) => {
          instructions.push(`${index + 1}. ${example.subject}: "${example.question}"`);
          instructions.push(`   Válasz formátum: "${example.format}"`);
          instructions.push(`   ${example.instruction}`);
        });
      }
    });

    instructions.push('\nKÖVETELMÉNYEK:');
    instructions.push('- Minden kérdés esetén kövesd pontosan a megadott formátumot');
    instructions.push('- A válaszok legyenek pontosak és egyértelműek');
    instructions.push('- Tartsd be a megadott stílust és szerkezetet');
    instructions.push('- Biztosítsd, hogy minden kérdés megfelelő nehézségű legyen');

    return instructions.join('\n');
  }

  isConfigurationValid(): boolean {
    return this.configuration.topic.trim().length > 0 &&
           this.configuration.cardCount >= 1 &&
           this.configuration.cardCount <= 15 &&
           this.configuration.correctAnswers >= 1 &&
           this.configuration.correctAnswers <= 3 &&
           this.configuration.wrongAnswers >= 1 &&
           this.configuration.wrongAnswers <= 3 &&
           this.configuration.questionTypes.length > 0; // Legalább egy típus kiválasztva
  }

  // Kérdéstípus kiválasztás kezelése
  toggleQuestionType(typeValue: string): void {
    const index = this.configuration.questionTypes.indexOf(typeValue);
    if (index > -1) {
      // Ha már kiválasztott és több mint egy típus van, akkor eltávolítjuk
      if (this.configuration.questionTypes.length > 1) {
        this.configuration.questionTypes.splice(index, 1);
      }
    } else {
      // Hozzáadjuk a kiválasztott típusokhoz
      this.configuration.questionTypes.push(typeValue);
    }
  }

  // Ellenőrzi, hogy a típus ki van-e választva
  isQuestionTypeSelected(typeValue: string): boolean {
    return this.configuration.questionTypes.includes(typeValue);
  }

  // Kérdéstípus címke lekérése
  getQuestionTypeLabel(typeValue: string): string {
    const typeConfig = this.allQuestionTypes.find(t => t.value === typeValue);
    if (typeConfig) {
      return this.translate.instant(typeConfig.labelKey);
    }
    return typeValue;
  }

  // Kérdéstípus ikon lekérése
  getQuestionTypeIcon(typeValue: string): string {
    const typeConfig = this.allQuestionTypes.find(t => t.value === typeValue);
    return typeConfig?.icon || 'help';
  }

  // Dropdown állapot kezelése
  // Backward compatibility - a cache-elt listákat adja vissza
  getRecommendedAndBasicTypes(): QuestionTypeConfig[] {
    return this.recommendedAndBasicTypesList;
  }

  getAdditionalTypes(): QuestionTypeConfig[] {
    return this.additionalTypesList;
  }

  // Kiválasztott típusok számának kiszámítása egy adott listából
  getSelectedCount(typeList: QuestionTypeConfig[]): number {
    return typeList.filter(type => this.isQuestionTypeSelected(type.value)).length;
  }

  // Dropdown toggle metódusok
  toggleRecommendedDropdown(): void {
    this.isRecommendedDropdownOpen = !this.isRecommendedDropdownOpen;
    if (this.isRecommendedDropdownOpen) {
      this.isAdditionalDropdownOpen = false; // Csak egy legyen nyitva egyszerre
    }
  }

  toggleAdditionalDropdown(): void {
    this.isAdditionalDropdownOpen = !this.isAdditionalDropdownOpen;
    if (this.isAdditionalDropdownOpen) {
      this.isRecommendedDropdownOpen = false; // Csak egy legyen nyitva egyszerre
    }
  }

  // Dropdown bezárása külső kattintásra
  closeDropdowns(): void {
    this.isRecommendedDropdownOpen = false;
    this.isAdditionalDropdownOpen = false;
  }

  // TrackBy function for better performance
  trackByTypeValue(index: number, type: QuestionTypeConfig): string {
    return type.value;
  }

  // Ajánlott csoport címe
  getRecommendedGroupTitle(): string {
    if (this.configuration.adaptiveTypeSelection && this.questionTypeGroups.length > 0) {
      const recommendedGroup = this.questionTypeGroups.find(group => group.defaultActive);
      if (recommendedGroup) {
        return recommendedGroup.title;
      }
    }
    return 'Alapvető és ajánlott típusok';
  }

  // Ajánlott csoport leírása
  getRecommendedGroupDescription(): string {
    if (this.configuration.adaptiveTypeSelection && this.questionTypeGroups.length > 0) {
      const recommendedGroup = this.questionTypeGroups.find(group => group.defaultActive);
      if (recommendedGroup) {
        return recommendedGroup.description;
      }
    }
    return 'Általánosan használható és témához illeszkedő kérdésformák';
  }

  // Összes kérdéstípus törlése (legalább egy marad)
  clearAllQuestionTypes(): void {
    if (this.configuration.questionTypes.length > 1) {
      // Csak az első típust hagyjuk meg
      this.configuration.questionTypes = [this.configuration.questionTypes[0]];
    }
  }

  // Adaptív kiválasztás be/kikapcsolása
  toggleAdaptiveSelection(): void {
    this.configuration.adaptiveTypeSelection = !this.configuration.adaptiveTypeSelection;
    this.updateQuestionTypeGroups();
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

  ngAfterViewInit(): void {
    // Futásidőben beállítjuk a select elem appearance tulajdonságait
    setTimeout(() => {
      const selectElement = this.elementRef.nativeElement.querySelector('#language');
      if (selectElement) {
        // CSS tulajdonságok beállítása
        this.renderer.setStyle(selectElement, '-webkit-appearance', 'none');
        this.renderer.setStyle(selectElement, '-moz-appearance', 'none');
        this.renderer.setStyle(selectElement, 'appearance', 'none');
        
        // További webkit specifikus tulajdonságok
        this.renderer.setStyle(selectElement, '-webkit-border-radius', '16px');
        this.renderer.setStyle(selectElement, '-webkit-box-shadow', 'none');
        this.renderer.setStyle(selectElement, '-webkit-user-select', 'none');
        
        // Inline stílusok még agresszívebb beállítása
        selectElement.style.webkitAppearance = 'none';
        selectElement.style.mozAppearance = 'none';
        selectElement.style.appearance = 'none';
        
        // További styling force
        selectElement.style.backgroundImage = "url('data:image/svg+xml;utf8,<svg fill=\"%23667eea\" height=\"24\" viewBox=\"0 0 24 24\" width=\"24\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M7 10l5 5 5-5z\"/></svg>')";
        selectElement.style.backgroundRepeat = 'no-repeat';
        selectElement.style.backgroundPosition = 'right 18px center';
        selectElement.style.backgroundSize = '20px';
        selectElement.style.paddingRight = '50px';
        
        // CSS attribútum direkt beállítása
        selectElement.setAttribute('style', selectElement.getAttribute('style') + '; -webkit-appearance: none !important; -moz-appearance: none !important; appearance: none !important;');
        
        console.log('Select element appearance reset applied:', {
          webkitAppearance: selectElement.style.webkitAppearance,
          mozAppearance: selectElement.style.mozAppearance,
          appearance: selectElement.style.appearance,
          computedStyle: window.getComputedStyle(selectElement).appearance
        });
      }
    }, 100);
  }

  // Custom dropdown methods
  toggleLanguageDropdown(): void {
    this.isLanguageDropdownOpen = !this.isLanguageDropdownOpen;
  }

  selectLanguage(value: string): void {
    this.configuration.language = value;
    this.isLanguageDropdownOpen = false;
  }

  getSelectedLanguageLabel(): string {
    const selectedOption = this.languageOptions.find(option => option.value === this.configuration.language);
    return selectedOption ? selectedOption.label : 'Magyar';
  }

  ngOnDestroy(): void {
    // Body scroll visszaállítása komponens megszűnésekor
    document.body.classList.remove('modal-open');
  }
}
