import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Project, QuizFolder } from '../../../../../core/services/quiz.service';

export interface BreadcrumbItem {
  id: string;
  name: string;
  type: 'project' | 'folder';
}

@Component({
  standalone: true,
  selector: 'app-quiz-header',
  templateUrl: './quiz-header.html',
  styleUrls: ['./quiz-header-simple.scss'],
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ]
})
export class QuizHeaderComponent {
  @Input() breadcrumb: BreadcrumbItem[] = [];
  @Input() showBackButton = false;
  @Input() currentProject: Project | null = null;
  @Input() currentFolder: QuizFolder | null = null;

  @Output() goBack = new EventEmitter<void>();
  @Output() navigateHome = new EventEmitter<void>();
  @Output() navigateToItem = new EventEmitter<BreadcrumbItem>();

  onGoBack(): void {
    this.goBack.emit();
  }

  onNavigateHome(): void {
    this.navigateHome.emit();
  }

  onNavigateToItem(item: BreadcrumbItem): void {
    this.navigateToItem.emit(item);
  }
}
