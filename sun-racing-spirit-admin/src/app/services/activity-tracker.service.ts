import { Injectable } from '@angular/core';
import { AdminAuthService } from './admin-auth.service';

@Injectable({
  providedIn: 'root'
})
export class ActivityTrackerService {
  private activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

  constructor(private authService: AdminAuthService) {
    this.setupActivityTracking();
  }

  private setupActivityTracking(): void {
    // Only track activity if user is authenticated
    this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        this.startTracking();
      } else {
        this.stopTracking();
      }
    });
  }

  private startTracking(): void {
    this.activityEvents.forEach(event => {
      document.addEventListener(event, this.onUserActivity.bind(this), true);
    });
  }

  private stopTracking(): void {
    this.activityEvents.forEach(event => {
      document.removeEventListener(event, this.onUserActivity.bind(this), true);
    });
  }

  private onUserActivity(): void {
    // Reset inactivity timer on any user activity
    this.authService.resetInactivityTimer();
  }
}


