import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private apiUrl = 'http://localhost:8080/api/auth';
  private refreshInterval: Subscription | null = null;
  private isActive = new BehaviorSubject<boolean>(true);
  private lastActivity = Date.now();
  private readonly ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

  constructor(private http: HttpClient) {
    this.startActivityTracking();
    this.startTokenRefresh();
  }

  /**
   * Start tracking user activity to determine if session should stay active
   */
  private startActivityTracking(): void {
    // Track mouse movement, clicks, and keyboard activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.lastActivity = Date.now();
        this.isActive.next(true);
      }, true);
    });

    // Check activity every 5 minutes
    setInterval(() => {
      const timeSinceLastActivity = Date.now() - this.lastActivity;
      if (timeSinceLastActivity > this.ACTIVITY_TIMEOUT) {
        this.isActive.next(false);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Start automatic token refresh for active users
   */
  private startTokenRefresh(): void {
    this.refreshInterval = interval(this.REFRESH_INTERVAL).subscribe(() => {
      if (this.isActive.value && this.isUserLoggedIn()) {
        this.refreshToken();
      }
    });
  }

  /**
   * Check if user is currently logged in
   */
  private isUserLoggedIn(): boolean {
    const token = localStorage.getItem('admin_token');
    return token !== null && token.trim() !== '';
  }

  /**
   * Refresh the JWT token
   */
  public refreshToken(): Observable<any> {
    const token = localStorage.getItem('admin_token');
    
    if (!token) {
      return new Observable(observer => {
        observer.error('No token found');
      });
    }

    return this.http.post(`${this.apiUrl}/admin/refresh-token`, { token }).pipe(
      tap((response: any) => {
        if (response.success && response.token) {
          // Update stored token
          localStorage.setItem('admin_token', response.token);
          localStorage.setItem('admin_user', JSON.stringify(response.user));
          if (response.permissions) {
            localStorage.setItem('admin_permissions', JSON.stringify(response.permissions));
          }
          console.log('Token refreshed successfully');
        }
      }),
      catchError(error => {
        console.error('Token refresh failed:', error);
        // If refresh fails, clear session and redirect to login
        this.clearSession();
        throw error;
      })
    );
  }

  /**
   * Clear user session
   */
  public clearSession(): void {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_permissions');
    this.isActive.next(false);
  }

  /**
   * Get current activity status
   */
  public getActivityStatus(): Observable<boolean> {
    return this.isActive.asObservable();
  }

  /**
   * Manually refresh token (for immediate refresh)
   */
  public forceRefreshToken(): Observable<any> {
    return this.refreshToken();
  }

  /**
   * Cleanup on service destroy
   */
  public ngOnDestroy(): void {
    if (this.refreshInterval) {
      this.refreshInterval.unsubscribe();
    }
  }
}

