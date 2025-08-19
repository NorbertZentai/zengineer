import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';

const routes: Routes = [
	{
		path: '',
		loadComponent: () =>
			import('./article-list/article-list.component').then(
				(m) => m.ArticleListComponent,
			),
	},
];

@NgModule({
	imports: [CommonModule, RouterModule.forChild(routes)],
})
export class ArticleManagerModule {}
