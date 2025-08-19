import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal, Output, EventEmitter } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ArticleService, Article } from '@features/article-manager/services/article.service';
import { ArticleFormComponent } from '../article-form/article-form.component';

@Component({
	selector: 'app-article-list',
	standalone: true,
	imports: [CommonModule, FormsModule, TranslateModule, MatIconModule, ArticleFormComponent],
	templateUrl: './article-list.component.html',
	styleUrls: ['./article-list.component.scss'],
})
export class ArticleListComponent {
	@Output() edit = new EventEmitter<Article>();
	@Output() delete = new EventEmitter<Article>();
	@Output() createNew = new EventEmitter<void>();

	private service = inject(ArticleService);

		articles = this.service.articles; // Signal<Article[]>
		filtered = signal<Article[]>([]);
		loading = this.service.loading;
	filterText = signal('');
	editingId = signal<string | null>(null);

	constructor() {
		effect(() => {
			const term = this.filterText().toLowerCase();
			const list: Article[] = this.articles();
			this.filtered.set(
				term
								? list.filter(
										(a: Article) =>
											a.title.toLowerCase().includes(term) ||
											a.tags.some((t: string) => t.toLowerCase().includes(term)),
									)
					: list,
			);
		});
	}

	trackById(_: number, a: Article) {
		return a.id;
	}

	newArticle() {
		this.createNew.emit();
	}

	startEdit(id: string) {
		const article = this.articles().find(a => a.id === id);
		if (article) {
			this.edit.emit(article);
		}
	}

	update(id: string, update: Partial<Omit<Article, 'id'>>) {
		this.service.update(id, update);
		this.editingId.set(null);
	}

	deleteArticle(id: string) {
		const article = this.articles().find(a => a.id === id);
		if (article) {
			this.service.delete(id);
			this.delete.emit(article);
		}
	}
}
