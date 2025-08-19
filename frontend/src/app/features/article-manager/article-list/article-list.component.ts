import { Component, signal, computed, output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

export interface Article {
  id: number;
  title: string;
  content?: string;
  tags?: string[];
  status: 'draft' | 'published';
  created_at?: string;
}

@Component({
  selector: 'app-article-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    TranslateModule
  ],
  templateUrl: './article-list.component.html',
  styleUrls: ['./article-list.component.scss']
})
export class ArticleListComponent {
  // Signals
  articles = signal<Article[]>([
    {
      id: 1,
      title: 'Az Angular fejlesztés alapjai',
      content: 'Az Angular egy nyílt forráskódú webalkalmazás-keretrendszer, amelyet a Google fejleszt...',
      tags: ['angular', 'typescript', 'frontend', 'webfejlesztés'],
      status: 'published',
      created_at: '2024-01-15T10:30:00Z'
    },
    {
      id: 2,
      title: 'TypeScript bevezető',
      content: 'A TypeScript a JavaScript egy típusosan tipizált változata, amely nagyobb projektekhez...',
      tags: ['typescript', 'javascript', 'programozás'],
      status: 'draft',
      created_at: '2024-01-10T14:20:00Z'
    },
    {
      id: 3,
      title: 'Modern CSS technikák',
      content: 'A CSS Grid és Flexbox használata modern weboldalak készítéséhez...',
      tags: ['css', 'grid', 'flexbox', 'design'],
      status: 'published',
      created_at: '2024-01-08T09:15:00Z'
    }
  ]);

  searchTerm = signal<string>('');
  sortBy = signal<string>('title');
  isLoading = signal<boolean>(false);
  error = signal<string>('');
  showScrollTop = signal<boolean>(false);
  activeMenuId = signal<number | null>(null);

  // Colors for articles (similar to quiz colors)
  private readonly colors = [
    '#4F46E5', '#7C3AED', '#DC2626', '#EA580C', 
    '#D97706', '#059669', '#0891B2', '#C026D3',
    '#9333EA', '#7C2D12', '#166534', '#0F172A'
  ];

  // Outputs
  editRequested = output<Article>();
  createRequested = output<void>();
  deleteRequested = output<Article>();
  previewRequested = output<Article>();

  // Computed filtered articles
  filteredArticles = computed(() => {
    let filtered = this.articles();
    
    // Filter by search term
    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(article => 
        article.title.toLowerCase().includes(search) ||
        article.content?.toLowerCase().includes(search) ||
        article.tags?.some(tag => tag.toLowerCase().includes(search))
      );
    }
    
    // Sort articles
    const sortBy = this.sortBy();
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'created':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'status':
          if (a.status === b.status) return 0;
          return a.status === 'published' ? -1 : 1;
        default:
          return 0;
      }
    });
  });

  // Listen to scroll for scroll-to-top button
  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.showScrollTop.set(window.pageYOffset > 300);
  }

  // Listen for clicks outside of menus to close them
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    // Close any open menus when clicking outside
    if (this.activeMenuId() !== null) {
      this.closeMenu();
    }
  }

  // Get article color based on ID
  getArticleColor(articleId: number): string {
    return this.colors[articleId % this.colors.length];
  }

  // Format date for display
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Get preview text from content
  getPreviewText(content: string): string {
    return content.length > 80 ? content.substring(0, 80) + '...' : content;
  }

  // Menu management
  toggleMenu(articleId: number, event: Event) {
    event.stopPropagation();
    if (this.activeMenuId() === articleId) {
      this.closeMenu();
    } else {
      this.activeMenuId.set(articleId);
    }
  }

  closeMenu() {
    this.activeMenuId.set(null);
  }

  // Event handlers
  onArticleClick(article: Article) {
    if (this.activeMenuId() === null) {
      this.editRequested.emit(article);
    }
  }

  onEdit(article: Article) {
    this.editRequested.emit(article);
  }

  onPreview(article: Article) {
    this.previewRequested.emit(article);
  }

  onDelete(article: Article) {
    this.deleteRequested.emit(article);
  }

  onCreateNew() {
    this.createRequested.emit();
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}