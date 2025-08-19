import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ArticleService, Article } from '@features/article-manager/services/article.service';
import { ArticleFormComponent } from '../article-form/article-form.component';

@Component({
	selector: 'app-article-list',
	standalone: true,
	imports: [CommonModule, FormsModule, TranslateModule, ArticleFormComponent],
	templateUrl: './article-list.component.html',
	styleUrls: ['./article-list.component.scss'],
})
export class ArticleListComponent {
	private service = inject(ArticleService);

		articles = this.service.articles; // Signal<Article[]>
		filtered = signal<Article[]>([]);
		loading = this.service.loading;
	filterText = signal('');
	creating = signal(false);
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
		this.creating.set(true);
	}

	cancelCreate() {
		this.creating.set(false);
	}

	save(article: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>) {
		this.service.create(article);
		this.creating.set(false);
	}

	startEdit(id: string) {
		this.editingId.set(id);
	}

	update(id: string, update: Partial<Omit<Article, 'id'>>) {
		this.service.update(id, update);
		this.editingId.set(null);
	}

	delete(id: string) {
		this.service.delete(id);
	}
}
