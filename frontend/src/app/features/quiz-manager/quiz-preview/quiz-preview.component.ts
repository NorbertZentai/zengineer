import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-quiz-preview',
  templateUrl: './quiz-preview.component.html',
  styleUrls: ['./quiz-preview.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class QuizPreviewComponent {
  @Input() quiz: any;
  @Output() back = new EventEmitter<void>();
}
