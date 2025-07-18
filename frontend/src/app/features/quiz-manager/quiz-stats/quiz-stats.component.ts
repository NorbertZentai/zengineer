import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-quiz-stats',
  templateUrl: './quiz-stats.component.html',
  styleUrls: ['./quiz-stats.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class QuizStatsComponent {
  @Input() quiz: any;
  @Output() back = new EventEmitter<void>();
}
