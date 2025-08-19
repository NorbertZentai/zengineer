import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';

const routes: Routes = [
	{
		path: '',
		loadComponent: () =>
			import('./article-manager.component').then(
				(m) => m.ArticleManagerComponent,
			),
	},
];

@NgModule({
	imports: [CommonModule, RouterModule.forChild(routes)],
})
export class ArticleManagerModule {}
