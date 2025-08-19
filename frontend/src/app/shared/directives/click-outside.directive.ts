import { Directive, ElementRef, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[clickOutside]',
  standalone: true
})
export class ClickOutsideDirective {
  @Output() clickOutside = new EventEmitter<Event>();

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  public onClick(event: Event): void {
    const targetElement = event.target as HTMLElement;
    
    if (!targetElement) {
      return;
    }

    const clickedInside = this.elementRef.nativeElement.contains(targetElement);
    
    if (!clickedInside) {
      this.clickOutside.emit(event);
    }
  }
}
