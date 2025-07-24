import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

export interface QuizQuestion {
  id?: string;
  text: string;
  type: 'multiple-choice' | 'true-false' | 'text-input';
  answers?: QuizAnswer[];
  correctAnswer?: string | boolean;
  points: number;
  explanation?: string;
}

export interface QuizAnswer {
  text: string;
  isCorrect: boolean;
}

@Component({
  selector: 'app-question-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './question-editor.component.html',
  styleUrls: ['./question-editor.component.scss']
})
export class QuestionEditorComponent implements OnInit {
  @Input() isEditMode: boolean = false;
  @Input() questionData?: QuizQuestion;
  @Output() save = new EventEmitter<QuizQuestion>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('questionEditor') questionEditor!: ElementRef;
  @ViewChild('imageInput') imageInput!: ElementRef;

  question: QuizQuestion = {
    text: '',
    type: 'multiple-choice',
    answers: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false }
    ],
    points: 1,
    explanation: ''
  };

  pointOptions = [1, 2, 3, 5, 10];

  ngOnInit() {
    if (this.isEditMode && this.questionData) {
      this.question = { ...this.questionData };
      
      // Ensure answers array exists for multiple choice
      if (this.question.type === 'multiple-choice' && !this.question.answers) {
        this.question.answers = [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false }
        ];
      }
    }
  }

  // Text formatting methods
  formatText(command: string) {
    document.execCommand(command, false, undefined);
    this.questionEditor.nativeElement.focus();
  }

  formatAnswerText(command: string, answerIndex: number) {
    const answerElement = document.querySelector(`.answer-editor:nth-of-type(${answerIndex + 1})`);
    if (answerElement) {
      (answerElement as HTMLElement).focus();
      document.execCommand(command, false, undefined);
    }
  }

  formatExplanationText(command: string) {
    const explanationElement = document.querySelector('.explanation-editor');
    if (explanationElement) {
      (explanationElement as HTMLElement).focus();
      document.execCommand(command, false, undefined);
    }
  }

  isFormatActive(command: string): boolean {
    return document.queryCommandState(command);
  }

  // Image handling
  insertImage() {
    this.imageInput.nativeElement.click();
  }

  onImageSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = `<img src="${e.target.result}" style="max-width: 100%; height: auto; margin: 10px 0;" alt="Inserted image">`;
        this.insertHtmlAtCursor(img);
      };
      reader.readAsDataURL(file);
    }
  }

  insertLink() {
    const url = prompt('Add meg a link URL-jét:');
    if (url) {
      const text = prompt('Add meg a link szövegét:') || url;
      const link = `<a href="${url}" target="_blank">${text}</a>`;
      this.insertHtmlAtCursor(link);
    }
  }

  private insertHtmlAtCursor(html: string) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const div = document.createElement('div');
      div.innerHTML = html;
      const fragment = document.createDocumentFragment();
      let node;
      while ((node = div.firstChild)) {
        fragment.appendChild(node);
      }
      range.insertNode(fragment);
    }
  }

  // Content change handlers
  onQuestionChange(event: any) {
    this.question.text = event.target.innerHTML;
  }

  onQuestionBlur() {
    // Clean up empty tags and normalize content
    this.question.text = this.cleanupHtml(this.question.text);
  }

  onAnswerChange(event: any, index: number) {
    if (this.question.answers && this.question.answers[index]) {
      this.question.answers[index].text = event.target.innerHTML;
    }
  }

  onExplanationChange(event: any) {
    this.question.explanation = event.target.innerHTML;
  }

  // Answer management
  addAnswer() {
    if (this.question.answers && this.question.answers.length < 6) {
      this.question.answers.push({ text: '', isCorrect: false });
    }
  }

  removeAnswer(index: number) {
    if (this.question.answers && this.question.answers.length > 2) {
      this.question.answers.splice(index, 1);
      
      // Ensure at least one answer is correct
      const hasCorrect = this.question.answers.some(answer => answer.isCorrect);
      if (!hasCorrect && this.question.answers.length > 0) {
        this.question.answers[0].isCorrect = true;
      }
    }
  }

  setCorrectAnswer(index: number) {
    if (this.question.answers) {
      this.question.answers.forEach((answer, i) => {
        answer.isCorrect = i === index;
      });
    }
  }

  // Validation
  isValid(): boolean {
    if (!this.question.text.trim()) return false;
    
    if (this.question.type === 'multiple-choice') {
      if (!this.question.answers || this.question.answers.length < 2) return false;
      
      const hasCorrect = this.question.answers.some(answer => answer.isCorrect);
      const allAnswersFilled = this.question.answers.every(answer => 
        this.stripHtml(answer.text).trim().length > 0
      );
      
      return hasCorrect && allAnswersFilled;
    }
    
    if (this.question.type === 'true-false') {
      return this.question.correctAnswer !== undefined;
    }
    
    if (this.question.type === 'text-input') {
      return !!this.question.correctAnswer && this.question.correctAnswer.toString().trim().length > 0;
    }
    
    return false;
  }

  // Utility methods
  private cleanupHtml(html: string): string {
    // Remove empty tags and normalize whitespace
    return html
      .replace(/<[^>]*>(\s*)<\/[^>]*>/g, '') // Remove empty tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private stripHtml(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  // Event handlers
  onSave() {
    if (this.isValid()) {
      // Clean up HTML content before saving
      this.question.text = this.cleanupHtml(this.question.text);
      if (this.question.explanation) {
        this.question.explanation = this.cleanupHtml(this.question.explanation);
      }
      
      if (this.question.answers) {
        this.question.answers.forEach(answer => {
          answer.text = this.cleanupHtml(answer.text);
        });
      }
      
      this.save.emit(this.question);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
