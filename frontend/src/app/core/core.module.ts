/**
 * Core Module - Singleton Services and Guards
 * 
 * This module contains application-wide singleton services,
 * guards, interceptors and other core functionality.
 * 
 * Should only be imported once in the root module.
 */

// Services
export * from './services/auth.service';
export * from './services/quiz.service';
export * from './services/notification.service';

// Guards
export * from './guards/auth-guard';

// Types and Interfaces
export interface User {
  id: string;
  email: string;
  name?: string;
  created_at?: Date;
}

export interface Quiz {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  cards?: QuizCard[];
  tags?: string[];
  created?: Date;
  updated?: Date;
}

export interface QuizCard {
  id: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  lastReviewed?: Date;
  nextReview?: Date;
  reviewCount: number;
  correctCount: number;
}
