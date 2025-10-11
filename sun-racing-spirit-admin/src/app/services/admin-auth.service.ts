import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of, throwError, timer, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: 'STAFF' | 'SUPER_ADMIN';
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AdminPermissions {
  canManageProducts: boolean;
  canViewOrders: boolean;
  canManageUsers: boolean;
  canCreateStaff: boolean;
  canViewDashboard: boolean;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  user: AdminUser;
  permissions: AdminPermissions;
  error?: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: AdminUser;
  permissions?: AdminPermissions;
  error?: string;
}

export interface CreateStaffRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface UpdateStaffRequest {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  isActive?: boolean;
  newPassword?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminAuthService {
  private apiUrl = environment.apiUrl + '/auth';
  private currentUserSubject = new BehaviorSubject<AdminUser | null>(null);
  private permissionsSubject = new BehaviorSubject<AdminPermissions | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private tokenRefreshTimer?: any;
  private inactivityTimer?: any;
  private readonly TOKEN_REFRESH_INTERVAL = 7 * 60 * 60 * 1000; // 7 hours (refresh before 8-hour expiry)
  private readonly INACTIVITY_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours of inactivity

  public currentUser$ = this.currentUserSubject.asObservable();
  public permissions$ = this.permissionsSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadStoredAuth();
    this.startTokenRefreshTimer();
    this.startInactivityTimer();
  }

  login(usernameOrEmail: string, password: string): Observable<LoginResponse> {
    const loginData = {
      usernameOrEmail: usernameOrEmail,
      password: password
    };

    return this.http.post<LoginResponse>(`${this.apiUrl}/admin/login`, loginData)
      .pipe(
        tap(response => {
          if (response.success) {
            this.setCurrentUser(response.user);
            this.setPermissions(response.permissions);
            this.storeAuth(response.user, response.permissions, response.token);
            this.startTokenRefreshTimer();
            this.startInactivityTimer();
          }
        })
      );
  }

  refreshToken(): Observable<RefreshTokenResponse> {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      return throwError(() => new Error('No token available for refresh'));
    }

    return this.http.post<RefreshTokenResponse>(`${this.apiUrl}/admin/refresh-token`, { token })
      .pipe(
        tap(response => {
          if (response.success && response.token) {
            // Update stored token
            localStorage.setItem('admin_token', response.token);
            // Restart refresh timer
            this.startTokenRefreshTimer();
          }
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Token refresh failed:', error);
          // If refresh fails, clear auth and logout
          this.clearAuth();
          return throwError(() => error);
        })
      );
  }

  validateSession(): Observable<boolean> {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      this.clearAuth();
      return of(false);
    }

    // Try to refresh token to validate session
    return this.refreshToken().pipe(
      map(() => true),
      catchError(() => {
        this.clearAuth();
        return of(false);
      })
    );
  }

  getCurrentUser(): AdminUser | null {
    return this.currentUserSubject.value;
  }

  getPermissions(): AdminPermissions | null {
    return this.permissionsSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  isSuperAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'SUPER_ADMIN';
  }

  isStaff(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'STAFF';
  }

  hasPermission(permission: keyof AdminPermissions): boolean {
    const permissions = this.getPermissions();
    return permissions?.[permission] || false;
  }

  // Staff Management (Super Admin only)
  getAllStaff(): Observable<{success: boolean, users: AdminUser[], error?: string}> {
    const headers = this.getAuthHeaders();
    return this.http.get<{success: boolean, users: AdminUser[], error?: string}>(`${this.apiUrl}/admin/staff`, { headers });
  }

  createStaff(staffData: CreateStaffRequest): Observable<{success: boolean, user?: AdminUser, message?: string, error?: string}> {
    const headers = this.getAuthHeaders();
    return this.http.post<{success: boolean, user?: AdminUser, message?: string, error?: string}>(`${this.apiUrl}/admin/create-staff`, staffData, { headers });
  }

  updateStaff(id: number, staffData: UpdateStaffRequest): Observable<{success: boolean, user?: AdminUser, message?: string, error?: string}> {
    const headers = this.getAuthHeaders();
    return this.http.put<{success: boolean, user?: AdminUser, message?: string, error?: string}>(`${this.apiUrl}/admin/staff/${id}`, staffData, { headers });
  }

  simpleUpdateStaff(id: number, staffData: any): Observable<{success: boolean, user?: AdminUser, message?: string, error?: string}> {
    const headers = this.getAuthHeaders();
    return this.http.put<{success: boolean, user?: AdminUser, message?: string, error?: string}>(`${this.apiUrl}/admin/staff/${id}/simple`, staffData, { headers });
  }

  deactivateStaff(id: number): Observable<{success: boolean, user?: AdminUser, message?: string, error?: string}> {
    const headers = this.getAuthHeaders();
    return this.http.put<{success: boolean, user?: AdminUser, message?: string, error?: string}>(`${this.apiUrl}/admin/staff/${id}/deactivate-simple`, {}, { headers });
  }

  terminateStaff(id: number): Observable<{success: boolean, message?: string, error?: string}> {
    const headers = this.getAuthHeaders();
    return this.http.delete<{success: boolean, message?: string, error?: string}>(`${this.apiUrl}/admin/staff/${id}/terminate`, { headers });
  }

  deleteStaff(id: number): Observable<{success: boolean, message?: string, error?: string}> {
    const headers = this.getAuthHeaders();
    return this.http.delete<{success: boolean, message?: string, error?: string}>(`${this.apiUrl}/admin/staff/${id}`, { headers });
  }

  logout(): Observable<{success: boolean, message?: string}> {
    // Stop all timers
    this.stopTokenRefreshTimer();
    this.stopInactivityTimer();
    
    // Try to get headers, but don't fail if user is already logged out
    let headers: HttpHeaders;
    try {
      headers = this.getAuthHeaders();
    } catch (error) {
      // If no auth headers available, create empty headers
      headers = new HttpHeaders();
    }
    
    return this.http.post<{success: boolean, message?: string}>(`${this.apiUrl}/admin/logout`, {}, { headers })
      .pipe(
        tap(() => {
          this.clearAuth();
        }),
        catchError(() => {
          // Even if logout fails on server, clear local auth
          this.clearAuth();
          return of({ success: true, message: 'Logged out locally' });
        })
      );
  }

  // Private helper methods
  private setCurrentUser(user: AdminUser): void {
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
  }

  private setPermissions(permissions: AdminPermissions): void {
    this.permissionsSubject.next(permissions);
  }

  private clearAuth(): void {
    this.stopTokenRefreshTimer();
    this.stopInactivityTimer();
    this.currentUserSubject.next(null);
    this.permissionsSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_permissions');
    localStorage.removeItem('admin_token');
  }

  private storeAuth(user: AdminUser, permissions: AdminPermissions, token?: string): void {
    localStorage.setItem('admin_user', JSON.stringify(user));
    localStorage.setItem('admin_permissions', JSON.stringify(permissions));
    if (token) {
      localStorage.setItem('admin_token', token);
    }
  }

  private loadStoredAuth(): void {
    try {
      const storedUser = localStorage.getItem('admin_user');
      const storedPermissions = localStorage.getItem('admin_permissions');

      if (storedUser && storedPermissions) {
        const user: AdminUser = JSON.parse(storedUser);
        const permissions: AdminPermissions = JSON.parse(storedPermissions);

        this.setCurrentUser(user);
        this.setPermissions(permissions);
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      this.clearAuth();
    }
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      throw new Error('User not authenticated');
    }

    const currentUser = this.getCurrentUser();
    const adminRole = currentUser?.role || 'SUPER_ADMIN';

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Admin-Role': adminRole
    });
    
    return headers;
  }

  private startTokenRefreshTimer(): void {
    this.stopTokenRefreshTimer(); // Clear any existing timer
    
    if (this.isAuthenticated()) {
      this.tokenRefreshTimer = setTimeout(() => {
        console.log('Refreshing token...');
        this.refreshToken().subscribe({
          next: () => {
            console.log('Token refreshed successfully');
          },
          error: (error) => {
            console.error('Token refresh failed, logging out:', error);
            this.clearAuth();
          }
        });
      }, this.TOKEN_REFRESH_INTERVAL);
    }
  }

  private stopTokenRefreshTimer(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = undefined;
    }
  }

  private startInactivityTimer(): void {
    this.stopInactivityTimer();
    
    if (this.isAuthenticated()) {
      this.inactivityTimer = setTimeout(() => {
        console.log('User inactive for too long, logging out...');
        this.clearAuth();
      }, this.INACTIVITY_TIMEOUT);
    }
  }

  private stopInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = undefined;
    }
  }

  // Method to reset inactivity timer (call this on user activity)
  public resetInactivityTimer(): void {
    if (this.isAuthenticated()) {
      this.startInactivityTimer();
    }
  }
}