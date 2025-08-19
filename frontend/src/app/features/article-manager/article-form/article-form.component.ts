import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, ActivatedRoute } from '@angular/router';
import { Article, ArticleService } from '@features/article-manager/services/article.service';
import { ClickOutsideDirective } from '@shared/directives/click-outside.directive';

export interface ArticleFormValue {
	title: string;
	content: string;
	tags: string[];
	published: boolean;
}

@Component({
	selector: 'app-article-form',
	standalone: true,
	imports: [CommonModule, FormsModule, TranslateModule, MatIconModule, ClickOutsideDirective],
	templateUrl: './article-form.component.html',
	styleUrls: ['./article-form.component.scss'],
})
export class ArticleFormComponent implements OnInit, AfterViewInit {
	@Input() article: Article | null = null;
	@Input() saving = false;
	@Input() savingDraft = false;
	@Output() cancel = new EventEmitter<void>();
	@Output() saveArticle = new EventEmitter<ArticleFormValue>();
	@Output() saveDraftArticle = new EventEmitter<ArticleFormValue>();
	@ViewChild('richEditor') richEditor!: ElementRef<HTMLDivElement>;

	model: ArticleFormValue & { tagsString?: string } = {
		title: '',
		content: '',
		tags: [],
		published: false,
		tagsString: '',
	};

	isEditMode = false;
	articleId: string | null = null;
	isEditingTitle = false;
	private originalTitle = '';

	// Rich Editor State
	viewMode: 'visual' | 'html' | 'preview' = 'visual';
	currentTextColor = '#000000';
	currentHighlightColor = '#ffff00';
	currentAlignment = 'left';
	currentHeading = '';
	showColorDropdown = false;
	showHighlightDropdown = false;
	showMoreOptions = false;

	// Color palettes
	textColors = [
		'#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
		'#ff0000', '#ff6600', '#ffcc00', '#00ff00', '#0066ff', '#6600ff',
		'#ff0066', '#ff3366', '#ff6699', '#66ff00', '#00ffcc', '#0099ff'
	];

	highlightColors = [
		'transparent', '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff6600',
		'#ffcc99', '#99ccff', '#cc99ff', '#ffccff', '#ccffcc', '#ffffcc'
	];

	constructor(
		private router: Router,
		private route: ActivatedRoute,
		private articleService: ArticleService
	) {}

	ngOnInit() {
		// Check if we're in edit mode
		this.articleId = this.route.snapshot.paramMap.get('id');
		this.isEditMode = !!this.articleId;

		if (this.isEditMode && this.articleId) {
			// Load article for editing
			this.loadArticle(this.articleId);
		}
	}

	ngAfterViewInit() {
		if (this.richEditor) {
			// Set up rich editor
			this.setupRichEditor();
		}
	}

	setupRichEditor() {
		const editor = this.richEditor.nativeElement;
		
		// Enable rich editing features
		document.execCommand('styleWithCSS', false, 'true');
		
		// Handle keyboard shortcuts
		editor.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
		
		// Update editor content if we have initial content
		if (this.model.content) {
			editor.innerHTML = this.model.content;
		}
	}

	handleKeyboardShortcuts(event: KeyboardEvent) {
		if (event.ctrlKey || event.metaKey) {
			switch (event.key.toLowerCase()) {
				case 'b':
					event.preventDefault();
					this.toggleFormat('bold');
					break;
				case 'i':
					event.preventDefault();
					this.toggleFormat('italic');
					break;
				case 'u':
					event.preventDefault();
					this.toggleFormat('underline');
					break;
				case 'z':
					if (!event.shiftKey) {
						event.preventDefault();
						this.undo();
					}
					break;
				case 'y':
					event.preventDefault();
					this.redo();
					break;
			}
		}
	}

	ngOnChanges() {
		if (this.article) {
			this.model = {
				title: this.article.title,
				content: this.article.content,
				tags: [...this.article.tags],
				tagsString: this.article.tags.join(', '),
				published: this.article.published,
			};
		}
	}

	loadArticle(id: string) {
		// Load article from service
		// This would typically call the article service
		// For now, we'll use mock data
	}

	submit() {
		// This is called when form is submitted, default to publish
		this.publish();
	}

	setTags(value: string) {
		this.model.tags = value
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);
	}

	goBack() {
		this.router.navigate(['/article-manager']);
	}

	saveDraft() {
		if (this.model.title.trim() && this.model.content.trim()) {
			this.model.published = false;
			
			if (this.isEditMode && this.articleId) {
				this.updateArticle(false);
			} else {
				this.createArticle(false);
			}
		}
	}

	publish() {
		if (this.model.title.trim() && this.model.content.trim()) {
			this.model.published = true;
			
			if (this.isEditMode && this.articleId) {
				this.updateArticle(true);
			} else {
				this.createArticle(true);
			}
		}
	}

	createArticle(publish: boolean = false) {
		if (publish) {
			this.saving = true;
		} else {
			this.savingDraft = true;
		}
		
		// Here you would call the article service to create the article
		// For now, we'll just navigate back
		setTimeout(() => {
			this.saving = false;
			this.savingDraft = false;
			this.goBack();
		}, 1000);
	}

	updateArticle(publish: boolean = false) {
		if (publish) {
			this.saving = true;
		} else {
			this.savingDraft = true;
		}
		
		// Here you would call the article service to update the article
		// For now, we'll just navigate back
		setTimeout(() => {
			this.saving = false;
			this.savingDraft = false;
			this.goBack();
		}, 1000);
	}

	removeTag(tagToRemove: string) {
		this.model.tags = this.model.tags.filter(tag => tag !== tagToRemove);
		this.model.tagsString = this.model.tags.join(', ');
	}

	startTitleEdit() {
		this.originalTitle = this.model.title;
		this.isEditingTitle = true;
		// Focus the input after the view updates
		setTimeout(() => {
			const input = document.querySelector('.title-edit-input') as HTMLInputElement;
			if (input) {
				input.focus();
				input.select();
			}
		});
	}

	finishTitleEdit() {
		this.isEditingTitle = false;
		// Clear original title since edit was finished
		this.originalTitle = '';
	}

	cancelTitleEdit() {
		this.model.title = this.originalTitle;
		this.isEditingTitle = false;
		this.originalTitle = '';
	}

	// Rich Text Editor Functions
	onRichEditorInput(event: Event) {
		const target = event.target as HTMLElement;
		this.model.content = target.innerHTML;
	}

	onEditorKeydown(event: KeyboardEvent) {
		// Handle special cases like Enter for paragraphs
		if (event.key === 'Enter' && !event.shiftKey) {
			// Let browser handle paragraph creation
		}
	}

	onEditorPaste(event: ClipboardEvent) {
		event.preventDefault();
		const text = event.clipboardData?.getData('text/plain') || '';
		const html = event.clipboardData?.getData('text/html') || '';
		
		if (html && html.trim()) {
			// Clean HTML before inserting
			const cleanHtml = this.sanitizeHTML(html);
			document.execCommand('insertHTML', false, cleanHtml);
		} else if (text) {
			document.execCommand('insertText', false, text);
		}
	}

	sanitizeHTML(html: string): string {
		// Basic HTML sanitization - in production use a proper sanitizer
		return html
			.replace(/<script[^>]*>.*?<\/script>/gi, '')
			.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
			.replace(/on\w+="[^"]*"/gi, '')
			.replace(/javascript:/gi, '');
	}

	syncVisualEditor() {
		if (this.richEditor && this.viewMode === 'html') {
			// Sync content from HTML editor to visual editor
			setTimeout(() => {
				if (this.richEditor) {
					this.richEditor.nativeElement.innerHTML = this.model.content;
				}
			});
		}
	}

	// Formatting Functions
	toggleFormat(command: string) {
		document.execCommand(command, false);
		this.updateFormatState();
	}

	isFormatActive(command: string): boolean {
		return document.queryCommandState(command);
	}

	updateFormatState() {
		// Update UI state based on current selection
		// This would be called after format changes
	}

	setTextColor(color: string) {
		this.currentTextColor = color;
		document.execCommand('foreColor', false, color);
		this.closeColorDropdown();
	}

	setHighlightColor(color: string) {
		this.currentHighlightColor = color;
		document.execCommand('hiliteColor', false, color);
		this.closeHighlightDropdown();
	}

	setHeading(event: any) {
		const heading = event.target.value;
		this.currentHeading = heading;
		
		if (heading) {
			document.execCommand('formatBlock', false, heading);
		} else {
			document.execCommand('formatBlock', false, 'div');
		}
	}

	setAlignment(alignment: string) {
		this.currentAlignment = alignment;
		const commands: { [key: string]: string } = {
			'left': 'justifyLeft',
			'center': 'justifyCenter',
			'right': 'justifyRight',
			'justify': 'justifyFull'
		};
		document.execCommand(commands[alignment], false);
	}

	toggleList(listType: string) {
		document.execCommand(listType, false);
	}

	indentList() {
		document.execCommand('indent', false);
	}

	outdentList() {
		document.execCommand('outdent', false);
	}

	insertLink() {
		const url = prompt('Link URL:');
		if (url) {
			document.execCommand('createLink', false, url);
		}
	}

	insertImage() {
		const url = prompt('Kép URL:');
		if (url) {
			document.execCommand('insertImage', false, url);
		}
	}

	insertTable() {
		const rows = prompt('Sorok száma:', '3');
		const cols = prompt('Oszlopok száma:', '3');
		
		if (rows && cols) {
			let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%;">';
			
			for (let i = 0; i < parseInt(rows); i++) {
				tableHTML += '<tr>';
				for (let j = 0; j < parseInt(cols); j++) {
					tableHTML += '<td style="padding: 8px; border: 1px solid #ddd;">&nbsp;</td>';
				}
				tableHTML += '</tr>';
			}
			
			tableHTML += '</table><p></p>';
			document.execCommand('insertHTML', false, tableHTML);
		}
	}

	insertCodeBlock() {
		const code = prompt('Kód:');
		if (code) {
			const codeHTML = `<pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace;"><code>${code}</code></pre><p></p>`;
			document.execCommand('insertHTML', false, codeHTML);
		}
	}

	insertQuote() {
		const quote = prompt('Idézet szövege:');
		if (quote) {
			const quoteHTML = `<blockquote style="margin: 16px 0; padding: 16px; border-left: 4px solid #ddd; background: #f9f9f9; font-style: italic;">${quote}</blockquote><p></p>`;
			document.execCommand('insertHTML', false, quoteHTML);
		}
	}

	insertHorizontalRule() {
		document.execCommand('insertHorizontalRule', false);
	}

	undo() {
		document.execCommand('undo', false);
	}

	redo() {
		document.execCommand('redo', false);
	}

	clearFormatting() {
		document.execCommand('removeFormat', false);
	}

	// View Mode Functions
	setViewMode(mode: 'visual' | 'html' | 'preview') {
		if (mode === 'html' && this.viewMode === 'visual') {
			// Sync content from visual to HTML
			if (this.richEditor) {
				this.model.content = this.richEditor.nativeElement.innerHTML;
			}
		}
		
		this.viewMode = mode;
		
		if (mode === 'visual') {
			// Sync content back to visual editor
			setTimeout(() => this.syncVisualEditor());
		}
	}

	// Dropdown Functions
	toggleColorDropdown() {
		this.showColorDropdown = !this.showColorDropdown;
		this.showHighlightDropdown = false;
	}

	toggleHighlightDropdown() {
		this.showHighlightDropdown = !this.showHighlightDropdown;
		this.showColorDropdown = false;
	}

	closeColorDropdown() {
		this.showColorDropdown = false;
	}

	closeHighlightDropdown() {
		this.showHighlightDropdown = false;
	}

	// More Options Dropdown Functions
	toggleMoreOptions() {
		this.showMoreOptions = !this.showMoreOptions;
		// Close other dropdowns
		this.showColorDropdown = false;
		this.showHighlightDropdown = false;
	}

	closeMoreOptions() {
		this.showMoreOptions = false;
	}

	// Helper functions for template
	isPreviewMode(): boolean {
		return this.viewMode === 'preview';
	}
}
