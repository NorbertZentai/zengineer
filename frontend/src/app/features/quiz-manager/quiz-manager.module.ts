import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { QuizStatsComponent } from './quiz-stats/quiz-stats.component';

const routes: Routes = [
  { path: '', component: QuizStatsComponent }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ],
})
export class QuizManagerModule {}
