import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { ArticleListComponent } from './article-list/article-list.component';
import { ArticleFormComponent } from './article-form/article-form.component';
import { Article } from './services/article.service';

@Component({
  selector: 'app-article-manager',
  templateUrl: './article-manager.component.html',
  styleUrls: ['./article-manager.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    TranslateModule,
    ArticleListComponent,
    ArticleFormComponent
  ]
})
export class ArticleManagerComponent {
  selectedArticle: any = null;
  viewMode: 'list' | 'edit' = 'list';
  showCreateModal = false;

  constructor() {}

  // Event handling
  onEdit(article: any) {
    this.selectedArticle = article;
    this.viewMode = 'edit';
  }

  onDelete(article: any) {
    // This will be handled by the article list component
  }

  onCreateNew() {
    this.showCreateModal = true;
  }

  onModalClose() {
    this.showCreateModal = false;
  }

  onArticleCreated(articleData: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>) {
    // Article successfully created, refresh the list
    this.showCreateModal = false;
    // The ArticleService automatically updates the list
  }

  onBack() {
    this.selectedArticle = null;
    this.viewMode = 'list';
  }
}
