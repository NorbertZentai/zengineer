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
    shuffleQuestions: true,
    showHints: true,
    immediateResultsForMC: false,
    allowRetry: true,
    maxRetries: 3
  };

  availableTestTypes: TestType[] = [];
  showAdvancedSettings = false;

  constructor(private testService: TestService) {
    this.availableTestTypes = [...this.testService.DEFAULT_TEST_TYPES];
    this.configuration.testTypes = this.availableTestTypes.map(type => ({ ...type }));
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
    
    // Estimate based on card count and types
    const baseTimePerCard = 30; // seconds
    const estimatedSeconds = this.totalCards * baseTimePerCard;
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
