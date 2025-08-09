import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './auth.service';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AiCardDTO {
  question: string;
  answers: Array<{ text: string; isCorrect: boolean }>;
  explanation?: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private baseUrl = environment.aiServerUrl;
  constructor(private auth: AuthService, private translate: TranslateService) {}
  // Emits when an AI request likely consumed quota
  public usageUpdated$ = new Subject<void>();
  private headers(extra?: Record<string, string>) {
    const userId = this.auth.currentUser?.id;
    return { 'Content-Type': 'application/json', ...(userId ? { 'x-user-id': userId } : {}), ...(extra || {}) };
  }

  async getHealth(userId?: string): Promise<{ ok: boolean; provider: string; model: string; used: number; limit: number; remaining: number; resetAt?: number; resetTz?: string; }> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        headers: this.headers(userId ? { 'x-user-id': userId } : undefined)
      });
      if (!res.ok) throw new Error(`Health error ${res.status}`);
      return res.json();
    } catch (err: any) {
  const hint = this.translate.instant('AI.ERRORS.SERVER_UNAVAILABLE');
  throw new Error(hint);
    }
  }

  async generateQuizCards(params: {
    topic?: string;
    language?: string;
    numQuestions?: number;
    sourceText?: string;
    testSummary?: unknown;
  difficulty?: 'easy' | 'medium' | 'hard';
  }): Promise<AiCardDTO[]> {
    try {
      const res = await fetch(`${this.baseUrl}/generate-quiz`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(params)
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => 'AI error');
        throw new Error(msg);
      }
      const data = await res.json();
      // Notify usage updated
      this.usageUpdated$.next();
      return data.cards as AiCardDTO[];
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if ([
        'Failed to fetch',
        'NetworkError',
        'ERR_CONNECTION_REFUSED',
        'TypeError: fetch'
      ].some((s) => msg.includes(s))) {
        throw new Error(this.translate.instant('AI.ERRORS.SERVER_NOT_RUNNING'));
      }
      throw err;
    }
  }

  async startAiTest(params: {
    topic?: string;
    language?: string;
    numQuestions?: number;
    sourceText?: string;
    testSummary?: unknown;
  }): Promise<{ id: string; type: 'AI'; startedAt: string; cards: AiCardDTO[] }> {
    try {
      const res = await fetch(`${this.baseUrl}/start-ai-test`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(params)
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => 'AI error');
        throw new Error(msg);
      }
      const data = await res.json();
      // Notify usage updated
      this.usageUpdated$.next();
      return data.test;
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if ([
        'Failed to fetch',
        'NetworkError',
        'ERR_CONNECTION_REFUSED',
        'TypeError: fetch'
      ].some((s) => msg.includes(s))) {
        throw new Error(this.translate.instant('AI.ERRORS.SERVER_NOT_RUNNING'));
      }
      throw err;
    }
  }
}
