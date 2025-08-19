import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { ArticleListComponent } from './article-list/article-list.component';

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
    ArticleListComponent
  ]
})
export class ArticleManagerComponent {
  constructor(private router: Router) {}

  // Event handling
  onEdit(article: any) {
    this.router.navigate(['/article-manager/edit', article.id]);
  }

  onDelete(article: any) {
    // This will be handled by the article list component
  }

  onCreateNew() {
    this.router.navigate(['/article-manager/create']);
  }
}
