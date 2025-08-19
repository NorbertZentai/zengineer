import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Article } from '@features/article-manager/services/article.service';

export interface ArticleFormValue {
	title: string;
	content: string;
	tags: string[];
	published: boolean;
}

@Component({
	selector: 'app-article-form',
	standalone: true,
	imports: [CommonModule, FormsModule, TranslateModule],
	templateUrl: './article-form.component.html',
	styleUrls: ['./article-form.component.scss'],
})
export class ArticleFormComponent {
	@Input() article: Article | null = null;
	@Input() saving = false;
	@Output() cancel = new EventEmitter<void>();
	@Output() saveArticle = new EventEmitter<ArticleFormValue>();

		model: ArticleFormValue & { tagsString?: string } = {
			title: '',
			content: '',
			tags: [],
			published: false,
			tagsString: '',
		};

	ngOnChanges() {
		if (this.article) {
			this.model = {
				title: this.article.title,
				content: this.article.content,
			tags: [...this.article.tags],
			tagsString: this.article.tags.join(','),
				published: this.article.published,
			};
		}
	}

	submit() {
		this.saveArticle.emit({ ...this.model });
	}

	setTags(value: string) {
		this.model.tags = value
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);
	}
}
