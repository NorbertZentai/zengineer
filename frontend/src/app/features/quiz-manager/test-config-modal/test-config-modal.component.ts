import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { TestConfiguration, TestType, TestService } from '../../../core/services/test.service';

@Component({
  selector: 'app-test-config-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TranslateModule],
  templateUrl: './test-config-modal.component.html',
  styleUrls: ['./test-config-modal.component.scss']
})
export class TestConfigModalComponent {
  @Input() quizId: string = '';
  @Input() quizName: string = '';
  @Input() totalCards: number = 0;
  @Output() close = new EventEmitter<void>();
  @Output() startTest = new EventEmitter<TestConfiguration>();

  configuration: TestConfiguration = {
    testTypes: [],
    timeLimit: undefined,
    questionCount: undefined,
    shuffleQuestions: true,
    showHints: true,
    immediateResultsForMC: false,
    allowRetry: true,
    maxRetries: 3
  };

  availableTestTypes: TestType[] = [];
  showAdvancedSettings = false;

  // Time limit options for dropdown
  timeLimitOptions = [
    { value: null, label: 'Nincs időkorlát' },
    { value: 5, label: '5 perc' },
    { value: 10, label: '10 perc' },
    { value: 15, label: '15 perc' },
    { value: 20, label: '20 perc' },
    { value: 30, label: '30 perc' },
    { value: 45, label: '45 perc' },
    { value: 60, label: '1 óra' },
    { value: 90, label: '1,5 óra' },
    { value: 120, label: '2 óra' }
  ];

  constructor(private testService: TestService) {
    this.availableTestTypes = [...this.testService.DEFAULT_TEST_TYPES];
    this.configuration.testTypes = this.availableTestTypes.map(type => ({ 
      ...type, 
      enabled: type.id === 'flashcard' // Alapértelmezetten a flashcard legyen bekapcsolva
    }));
  }

  toggleTestType(typeId: string): void {
    const testType = this.configuration.testTypes.find(t => t.id === typeId);
    if (testType) {
      testType.enabled = !testType.enabled;
    }
  }

  isTestTypeEnabled(typeId: string): boolean {
    return this.configuration.testTypes.find(t => t.id === typeId)?.enabled || false;
  }

  getEnabledTestTypesCount(): number {
    return this.configuration.testTypes.filter(t => t.enabled).length;
  }

  setTimeLimit(minutes: number | null): void {
    this.configuration.timeLimit = minutes || undefined;
  }

  setQuestionCount(count: number | null): void {
    this.configuration.questionCount = count || undefined;
  }

  getMaxQuestions(): number {
    return this.totalCards;
  }

  getSelectedQuestionCount(): number {
    return this.configuration.questionCount || this.totalCards;
  }

  getTimeLimitDisplay(): string {
    return this.configuration.timeLimit ? this.configuration.timeLimit.toString() : 'Nincs';
  }

  getQuestionCountOptions(): number[] {
    const options = [5, 10, 15, 20, 25, 30, 40, 50];
    return options.filter(n => n <= this.totalCards);
  }

  onStartTest(): void {
    if (!this.isConfigurationValid()) {
      return;
    }

    this.startTest.emit(this.configuration);
  }

  onClose(): void {
    this.close.emit();
  }

  isConfigurationValid(): boolean {
    return this.getEnabledTestTypesCount() > 0;
  }

  getEstimatedTime(): string {
    if (this.configuration.timeLimit) {
      return `${this.configuration.timeLimit} perc (időkorlát)`;
    }
    
    // Estimate based on selected question count and types
    const questionCount = this.getSelectedQuestionCount();
    const baseTimePerCard = 30; // seconds
    const estimatedSeconds = questionCount * baseTimePerCard;
    const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
    
    return `~${estimatedMinutes} perc (becsült)`;
  }

  getTestDescription(): string {
    const enabledTypes = this.configuration.testTypes.filter(t => t.enabled);
    if (enabledTypes.length === 0) {
      return 'Válassz legalább egy teszt típust!';
    }
    
    if (enabledTypes.length === 1) {
      return enabledTypes[0].description;
    }
    
    return `Vegyes teszt ${enabledTypes.length} különböző típussal`;
  }

  toggleAdvancedSettings(): void {
    this.showAdvancedSettings = !this.showAdvancedSettings;
  }
}
