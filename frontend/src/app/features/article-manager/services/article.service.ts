import { Injectable, signal } from '@angular/core';

export interface Article {
  id: string;
  title: string;
  content: string;
  tags: string[];
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({ providedIn: 'root' })
export class ArticleService {
  private _articles = signal<Article[]>([]);
  private _loading = signal(false);

  readonly articles = this._articles.asReadonly();
  readonly loading = this._loading.asReadonly();

  create(data: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date();
    const article: Article = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this._articles.update((arr) => [article, ...arr]);
  }

  update(id: string, patch: Partial<Omit<Article, 'id'>>) {
    this._articles.update((arr) =>
      arr.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: new Date() } : a)),
    );
  }

  delete(id: string) {
    this._articles.update((arr) => arr.filter((a) => a.id !== id));
  }
}
