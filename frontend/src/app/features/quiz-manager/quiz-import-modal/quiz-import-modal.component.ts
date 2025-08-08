import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { QuizService, QuizCard } from '../../../core/services/quiz.service';

@Component({
  selector: 'app-quiz-import-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './quiz-import-modal.component.html',
  styleUrls: ['./quiz-import-modal.component.scss']
})
export class QuizImportModalComponent {
  closeInfo() {
    this.showInfo = false;
  }
  showInfo = false;
  infoText = 'Importálj kvízt fájlból vagy JSON kódból. Válassz módot, töltsd fel a fájlt vagy illeszd be a kódot!';
  toggleInfo() {
    this.showInfo = !this.showInfo;
  }
  importTarget: 'new' | 'existing' = 'new';
  quizName: string = '';
  selectedQuizId: string = '';
  quizzes: { id: string, name: string }[] = [];

  constructor(private quizService: QuizService) {}

  async ngOnInit() {
    // Töltsük be a kvíz listát a meglévőhöz való importáláshoz
    try {
      await this.quizService.loadQuizzes();
      const list = this.quizService.allQuizzes();
      this.quizzes = (list || []).filter(q => !!q.id).map(q => ({ id: q.id as string, name: q.name }));
    } catch {}
  }
  @Output() close = new EventEmitter<void>();
  @Output() imported = new EventEmitter<any>();

  importMode: 'file' | 'code' = 'file';
  file: File | null = null;
  code: string = '';
  error: string = '';
  isLoading = false;
  success = false;
  // Placeholder minta a kód/JSON módhoz
  codePlaceholder: string = `Illeszd be ide a kvíz JSON kódját (példák):\n\n1) Egyszerű kártyák (flashcard):\n[\n  { "question": "Mi Magyarország fővárosa?", "answer": "Budapest" },\n  { "question": "2 + 2 = ?", "answer": "4" }\n]\n\n2) Feleletválasztós kártya:\n{\n  "cards": [\n    {\n      "question": "Melyik gyümölcs?",\n      "answers": [\n        { "text": "Alma", "correct": true },\n        { "text": "Répa", "correct": false }\n      ]\n    }\n  ]\n}\n\nCSV is támogatott: fejléc például\nquestion,answer1,correct1,answer2,correct2\n"Mi a szín?","Piros",true,"Zöld",false`;

  // Optional settings
  category: string = '';
  overwrite = false;
  isPublic = true;

  onFileChange(event: any) {
    const files = event.target.files as FileList;
    if (files && files.length > 0) {
      this.file = files[0];
      this.error = '';
    }
  }

  async onImport() {
    this.error = '';
    this.success = false;

    try {
      // Alap validáció
      if (this.importMode === 'file' && !this.file) {
        this.error = 'Nincs fájl kiválasztva!';
        return;
      }
      if (this.importMode === 'code' && !this.code.trim()) {
        this.error = 'Nincs kód megadva!';
        return;
      }
      if (this.importTarget === 'existing' && !this.selectedQuizId) {
        this.error = 'Válassz meglévő kvízt!';
        return;
      }
      if (this.importTarget === 'new' && !this.quizName.trim()) {
        this.error = 'Adj meg egy nevet az új kvíznek!';
        return;
      }

      this.isLoading = true;

      // Bemenet beolvasása
      let raw: string;
      if (this.importMode === 'file') {
        raw = await (this.file as File).text();
      } else {
        raw = this.code;
      }

      // Parse-olás JSON-re vagy CSV-re
      let cards: Array<Partial<QuizCard>> = [];
      const isCsv = this.file?.name?.toLowerCase().endsWith('.csv') || (!this.file && this.looksLikeCsv(raw));

      if (isCsv) {
        cards = this.parseCsvToCards(raw);
      } else {
        cards = this.parseJsonToCards(raw);
      }

      if (!cards.length) {
        this.error = 'Nem találtam importálható kártyákat.';
        return;
      }

      // Kvíz létrehozása vagy kiválasztása
      let quizId = this.selectedQuizId;
      let createdNew = false;
      if (this.importTarget === 'new') {
        const created = await this.quizService.createQuiz({
          name: this.quizName.trim(),
          description: this.category?.trim() || null as any,
          color: '#667eea',
          // visibility/tags ideiglenesen nem kerül mentésre a backend korlátai miatt
          visibility: this.isPublic ? 'public' : 'private',
          tags: [],
          study_modes: [],
          estimated_time: 0,
          language: 'hu'
        } as any);
        quizId = created.id as string;
        createdNew = true;
      }

      if (!quizId) {
        this.error = 'Nem sikerült meghatározni a kvíz azonosítóját.';
        return;
      }

      // Kártyák mentése sorban
      let createdCount = 0;
      for (const card of cards) {
        try {
          await this.quizService.addCard(quizId, {
            quiz_id: quizId,
            question: card.question || '',
            answer: card.answer,
            card_type: card.card_type || 'flashcard',
            hint: card.hint,
            tags: card.tags || [],
            difficulty: card.difficulty || 2
          });
          createdCount++;
        } catch (e) {
          // Folytassuk a következővel
          console.error('Card import failed:', e);
        }
      }

      this.success = true;
      this.imported.emit({ quizId, createdNew, createdCount });
      await this.quizService.loadQuizzes();
    } catch (e: any) {
      this.error = e?.message || 'Ismeretlen hiba történt import közben.';
    } finally {
      this.isLoading = false;
    }
  }

  onClose() {
    this.close.emit();
  }

  // --- Helper függvények ---
  private looksLikeCsv(input: string): boolean {
    const firstLine = (input || '').split(/\r?\n/)[0] || '';
    return firstLine.includes(',');
  }

  private parseCsvToCards(csv: string): Array<Partial<QuizCard>> {
    const lines = csv.split(/\r?\n/).filter(l => l.trim().length);
    if (!lines.length) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const questionIdx = headers.indexOf('question');
    // Támogatás: answer1,correct1,... formátum
    const answerIdxs = [1,2,3,4,5,6,7,8].map(i => ({
      text: headers.indexOf(`answer${i}`),
      correct: headers.indexOf(`correct${i}`)
    }));

    const out: Array<Partial<QuizCard>> = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = this.safeSplitCsvLine(lines[i]);
      if (questionIdx < 0 || !cols[questionIdx]) continue;
      const question = cols[questionIdx].trim();

      // Ha vannak answerX oszlopok, multiple choice-ként kezeljük
      const mcAnswers: {text: string, correct: boolean}[] = [];
      for (const ai of answerIdxs) {
        const t = ai.text >= 0 ? (cols[ai.text] || '').trim() : '';
        const cRaw = ai.correct >= 0 ? (cols[ai.correct] || '').trim().toLowerCase() : '';
        if (t) {
          const isC = cRaw === 'true' || cRaw === '1' || cRaw === 'yes';
          mcAnswers.push({ text: t, correct: isC });
        }
      }

      if (mcAnswers.length) {
        const correct = mcAnswers.filter(a => a.correct).map(a => a.text);
        const incorrect = mcAnswers.filter(a => !a.correct).map(a => a.text);
        const answer = JSON.stringify({ type: 'multiple_choice', correct, incorrect });
        out.push({ question, answer, card_type: 'multiple_choice' });
      } else {
        // Ellenkező esetben keressünk egy 'answer' oszlopot
        const answerIdx = headers.indexOf('answer');
        const answer = answerIdx >= 0 ? (cols[answerIdx] || '').trim() : '';
        out.push({ question, answer, card_type: 'flashcard' });
      }
    }

    return out;
  }

  private safeSplitCsvLine(line: string): string[] {
    // Egyszerű CSV split, idézőjelek minimális kezelése
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result.map(v => v.replace(/^\"|\"$/g, ''));
  }

  private parseJsonToCards(raw: string): Array<Partial<QuizCard>> {
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      throw new Error('Érvénytelen JSON formátum.');
    }

    // Támogatott formátumok:
    // 1) { title, questions: [ { question, answers: [ {text, correct} ] } ] }
    // 2) [ { question, answer } ] egyszerű flashcard lista
    // 3) { cards: [ { question, answer, type } ] }

    const cards: Array<Partial<QuizCard>> = [];

    if (Array.isArray(data)) {
      for (const item of data) {
        if (item && item.question) {
          cards.push({ question: String(item.question), answer: item.answer ?? '', card_type: item.card_type || 'flashcard' });
        }
      }
      return cards;
    }

    if (data && Array.isArray(data.cards)) {
      for (const item of data.cards) {
        if (!item?.question) continue;
        if (item.answers && Array.isArray(item.answers)) {
          const correct = item.answers.filter((a: any) => a.correct).map((a: any) => String(a.text));
          const incorrect = item.answers.filter((a: any) => !a.correct).map((a: any) => String(a.text));
          const answer = JSON.stringify({ type: 'multiple_choice', correct, incorrect, hint: item.hint });
          cards.push({ question: String(item.question), answer, card_type: 'multiple_choice' });
        } else {
          cards.push({ question: String(item.question), answer: item.answer ?? '', card_type: item.card_type || 'flashcard' });
        }
      }
      return cards;
    }

    if (data && Array.isArray(data.questions)) {
      for (const q of data.questions) {
        if (!q?.question) continue;
        if (Array.isArray(q.answers)) {
          const correct = q.answers.filter((a: any) => a.correct).map((a: any) => String(a.text));
          const incorrect = q.answers.filter((a: any) => !a.correct).map((a: any) => String(a.text));
          const answer = JSON.stringify({ type: 'multiple_choice', correct, incorrect, hint: q.hint });
          cards.push({ question: String(q.question), answer, card_type: 'multiple_choice' });
        } else {
          cards.push({ question: String(q.question), answer: q.answer ?? '', card_type: q.card_type || 'flashcard' });
        }
      }
      return cards;
    }

    throw new Error('Ismeretlen JSON struktúra. Várható: questions tömb vagy cards tömb.');
  }
}
