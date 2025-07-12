import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { NotificationService, ToastMessage } from '../../../core/services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-toast-notification',
  templateUrl: './toast-notification.html',
  styleUrls: ['./toast-notification.scss'],
  imports: [CommonModule, MatIconModule, TranslateModule],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class ToastNotification implements OnInit, OnDestroy {
  toasts: ToastMessage[] = [];
  private subscription: Subscription = new Subscription();
  
  constructor(private notificationService: NotificationService) {}
  
  ngOnInit() {
    this.subscription = this.notificationService.toasts.subscribe((toasts: ToastMessage[]) => {
      this.toasts = toasts;
    });
  }
  
  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
  
  removeToast(id: string) {
    this.notificationService.remove(id);
  }
  
  getIcon(type: string): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'notifications';
    }
  }
  
  trackByFn(index: number, item: ToastMessage): string {
    return item.id;
  }
}
