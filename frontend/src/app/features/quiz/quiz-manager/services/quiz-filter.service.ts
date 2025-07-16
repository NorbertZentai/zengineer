import { Injectable, signal, computed } from '@angular/core';
import { Quiz, QuizFolder } from '../../../../core/services/quiz.service';
import { FilterOptions } from '../components/quiz-filter/quiz-filter';

@Injectable({
  providedIn: 'root'
})
export class QuizFilterService {
  
  /**
   * Applies filters to quizzes array
   */
  filterQuizzes(quizzes: Quiz[], filters: FilterOptions): Quiz[] {
    let filteredQuizzes = [...quizzes];

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filteredQuizzes = filteredQuizzes.filter(quiz =>
        quiz.name.toLowerCase().includes(query) ||
        quiz.description?.toLowerCase().includes(query) ||
        quiz.tags.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }

    // Difficulty filter
    if (filters.difficulty !== null) {
      filteredQuizzes = filteredQuizzes.filter(quiz => 
        quiz.difficulty_level === filters.difficulty
      );
    }

    // Tags filter
    if (filters.selectedTags.length > 0) {
      filteredQuizzes = filteredQuizzes.filter(quiz =>
        filters.selectedTags.every(tag => quiz.tags.includes(tag))
      );
    }

    // Sort
    filteredQuizzes = this.sortQuizzes(filteredQuizzes, filters.sortBy, filters.sortDirection);

    return filteredQuizzes;
  }

  /**
   * Applies filters to folders array
   */
  filterFolders(folders: QuizFolder[], filters: FilterOptions): QuizFolder[] {
    let filteredFolders = [...folders];

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filteredFolders = filteredFolders.filter(folder =>
        folder.name.toLowerCase().includes(query) ||
        folder.description?.toLowerCase().includes(query)
      );
    }

    // Sort folders by name
    filteredFolders.sort((a, b) => {
      if (filters.sortDirection === 'asc') {
        return a.name.localeCompare(b.name);
      } else {
        return b.name.localeCompare(a.name);
      }
    });

    return filteredFolders;
  }

  /**
   * Extracts all unique tags from quizzes
   */
  extractAvailableTags(quizzes: Quiz[]): string[] {
    const tagSet = new Set<string>();
    
    quizzes.forEach(quiz => {
      quiz.tags.forEach((tag: string) => tagSet.add(tag));
    });
    
    return Array.from(tagSet).sort();
  }

  /**
   * Sorts quizzes based on specified criteria
   */
  private sortQuizzes(quizzes: Quiz[], sortBy: string, direction: 'asc' | 'desc'): Quiz[] {
    return quizzes.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created':
          comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          break;
        case 'updated':
          comparison = new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime();
          break;
        case 'cards':
          comparison = (a.cards?.length || 0) - (b.cards?.length || 0);
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }

      return direction === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Creates a search score for ranking results
   */
  private calculateSearchScore(item: Quiz | QuizFolder, query: string): number {
    const lowerQuery = query.toLowerCase();
    let score = 0;

    // Name match (highest priority)
    if (item.name.toLowerCase().includes(lowerQuery)) {
      score += item.name.toLowerCase() === lowerQuery ? 100 : 50;
    }

    // Description match
    if (item.description?.toLowerCase().includes(lowerQuery)) {
      score += 25;
    }

    // Tag match (for quizzes)
    if ('tags' in item) {
      const tagMatches = item.tags.filter((tag: string) => 
        tag.toLowerCase().includes(lowerQuery)
      ).length;
      score += tagMatches * 10;
    }

    return score;
  }

  /**
   * Advanced search with scoring and ranking
   */
  searchWithRanking(quizzes: Quiz[], folders: QuizFolder[], query: string) {
    if (!query.trim()) {
      return { quizzes, folders };
    }

    const scoredQuizzes = quizzes
      .map(quiz => ({
        item: quiz,
        score: this.calculateSearchScore(quiz, query)
      }))
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(result => result.item);

    const scoredFolders = folders
      .map(folder => ({
        item: folder,
        score: this.calculateSearchScore(folder, query)
      }))
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(result => result.item);

    return {
      quizzes: scoredQuizzes,
      folders: scoredFolders
    };
  }
}
