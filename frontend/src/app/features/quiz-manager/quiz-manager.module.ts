import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { QuizManagerComponent } from './quiz-manager.component';

const routes: Routes = [
  { path: '', component: QuizManagerComponent },
  { 
    path: 'test/:sessionId', 
    loadComponent: () => import('./test-execution/test-execution.component').then(m => m.TestExecutionComponent)
  },
  { 
    path: ':id', 
    loadComponent: () => import('./quiz-details/quiz-details.component').then(m => m.QuizDetailsComponent)
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ],
})
export class QuizManagerModule {}
