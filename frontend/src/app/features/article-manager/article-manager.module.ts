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
	{
		path: 'create',
		loadComponent: () =>
			import('./article-form/article-form.component').then(
				(m) => m.ArticleFormComponent,
			),
	},
	{
		path: 'edit/:id',
		loadComponent: () =>
			import('./article-form/article-form.component').then(
				(m) => m.ArticleFormComponent,
			),
	},
];

@NgModule({
	imports: [CommonModule, RouterModule.forChild(routes)],
})
export class ArticleManagerModule {}
