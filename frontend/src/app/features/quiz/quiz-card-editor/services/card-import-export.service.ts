import { Injectable } from '@angular/core';
import { QuizCard } from '../../../../core/services/quiz.service';

export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CardImportExportService {

  /**
   * Import cards from JSON format
   */
  async importFromJSON(content: string): Promise<Partial<QuizCard>[]> {
    try {
      const data = JSON.parse(content);
      let cardsToImport: Partial<QuizCard>[] = [];

      if (Array.isArray(data)) {
        cardsToImport = data;
      } else if (data.cards && Array.isArray(data.cards)) {
        cardsToImport = data.cards;
      } else {
        throw new Error('Invalid JSON format: Expected array or object with cards property');
      }

      return cardsToImport;
    } catch (error) {
      throw new Error(`JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import cards from CSV format
   */
  async importFromCSV(content: string): Promise<Partial<QuizCard>[]> {
    const lines = content.split('\n').filter(line => line.trim());
    const cardsToImport: Partial<QuizCard>[] = [];

    // Skip header if present
    const startIndex = this.detectCSVHeader(lines) ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      try {
        const columns = this.parseCSVLine(lines[i]);
        if (columns.length >= 2) {
          cardsToImport.push({
            front: columns[0]?.trim(),
            back: columns[1]?.trim(),
            difficulty: (columns[2]?.trim() as 'easy' | 'medium' | 'hard') || 'medium',
            tags: columns[3] ? columns[3].split(',').map(tag => tag.trim()) : []
          });
        }
      } catch (error) {
        console.warn(`Skipping line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return cardsToImport;
  }

  /**
   * Import cards from plain text format
   */
  async importFromText(content: string): Promise<Partial<QuizCard>[]> {
    const sections = content.split('---').filter(section => section.trim());
    const cardsToImport: Partial<QuizCard>[] = [];

    for (const section of sections) {
      const lines = section.split('\n').filter(line => line.trim());
      if (lines.length >= 2) {
        cardsToImport.push({
          front: lines[0].trim(),
          back: lines[1].trim(),
          difficulty: 'medium',
          tags: []
        });
      }
    }

    // Fallback: try line-by-line format
    if (cardsToImport.length === 0) {
      const lines = content.split('\n').filter(line => line.trim());
      for (let i = 0; i < lines.length; i += 2) {
        if (i + 1 < lines.length) {
          cardsToImport.push({
            front: lines[i].trim(),
            back: lines[i + 1].trim(),
            difficulty: 'medium',
            tags: []
          });
        }
      }
    }

    return cardsToImport;
  }

  /**
   * Export cards to JSON format
   */
  exportAsJSON(cards: QuizCard[], quizName: string): string {
    const data = {
      quiz: {
        name: quizName,
        exportedAt: new Date().toISOString()
      },
      cards: cards.map(card => ({
        front: card.front,
        back: card.back,
        difficulty: card.difficulty,
        tags: card.tags,
        reviewCount: card.reviewCount || 0,
        successRate: card.successRate || 0
      }))
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Export cards to CSV format
   */
  exportAsCSV(cards: QuizCard[]): string {
    const headers = ['Front', 'Back', 'Difficulty', 'Tags', 'Review Count', 'Success Rate'];
    const rows = cards.map(card => [
      this.escapeCSVField(card.front),
      this.escapeCSVField(card.back),
      card.difficulty,
      `"${card.tags.join(', ')}"`,
      (card.reviewCount || 0).toString(),
      ((card.successRate || 0) * 100).toFixed(1) + '%'
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Export cards to plain text format
   */
  exportAsText(cards: QuizCard[]): string {
    return cards.map(card => `${card.front}\n${card.back}\n---`).join('\n\n');
  }

  /**
   * Create and download file
   */
  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  /**
   * Detect if CSV has a header row
   */
  private detectCSVHeader(lines: string[]): boolean {
    if (lines.length === 0) return false;
    
    const firstLine = lines[0].toLowerCase();
    return firstLine.includes('front') || 
           firstLine.includes('back') || 
           firstLine.includes('question') ||
           firstLine.includes('answer');
  }

  /**
   * Parse a single CSV line handling quoted fields
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  /**
   * Escape CSV field content
   */
  private escapeCSVField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
}
