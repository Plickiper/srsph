import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';
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
  email?: string;
  phoneNumber?: string;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AdminAuthService {
  private apiUrl = environment.apiUrl + '/auth';
  private currentUserSubject = new BehaviorSubject<AdminUser | null>(null);
  private permissionsSubject = new BehaviorSubject<AdminPermissions | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public permissions$ = this.permissionsSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadStoredAuth();
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
          }
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

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    
    return headers;
  }
}