import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  gender?: string;
  dateOfBirth?: string;
  profilePicture?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  gender?: string;
  dateOfBirth?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private tokenKey = 'auth_token';
  private userKey = 'current_user';

  constructor(private http: HttpClient) {
    this.loadStoredUser();
  }

  // Load user from localStorage on service initialization
  private loadStoredUser(): void {
    const token = localStorage.getItem(this.tokenKey);
    const userStr = localStorage.getItem(this.userKey);
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        // Validate token before setting user as logged in
        this.validateToken().subscribe({
          next: (response) => {
            if (response.success) {
              this.currentUserSubject.next(user);
            } else {
              // Token is invalid, clear stored data
              this.clearStoredData();
            }
          },
          error: () => {
            // Token validation failed, clear stored data
            this.clearStoredData();
          }
        });
      } catch (error) {
        console.error('Error parsing stored user:', error);
        this.clearStoredData();
      }
    }
  }

  // Login method
  login(usernameOrEmail: string, password: string): Observable<AuthResponse> {
    const loginData: LoginRequest = { usernameOrEmail, password };
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/customer/auth/login`, loginData)
      .pipe(
        map(response => {
          if (response.success && response.token && response.user) {
            this.setStoredData(response.token, response.user);
            this.currentUserSubject.next(response.user);
          }
          return response;
        }),
        catchError(error => {
          console.error('Login error:', error);
          return of({
            success: false,
            message: error.error?.message || 'Login failed. Please try again.'
          });
        })
      );
  }

  // Register method
  register(username: string, email: string, password: string, firstName?: string, lastName?: string, phoneNumber?: string, gender?: string, dateOfBirth?: string): Observable<AuthResponse> {
    const registerData: RegisterRequest = { username, email, password, firstName, lastName, phoneNumber, gender, dateOfBirth };
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/customer/auth/register`, registerData)
      .pipe(
        map(response => {
          if (response.success && response.token && response.user) {
            this.setStoredData(response.token, response.user);
            this.currentUserSubject.next(response.user);
          }
          return response;
        }),
        catchError(error => {
          console.error('Registration error:', error);
          return of({
            success: false,
            message: error.error?.message || 'Registration failed. Please try again.'
          });
        })
      );
  }

  // Logout method
  logout(): void {
    this.clearStoredData();
    this.currentUserSubject.next(null);
    // Refresh the page to ensure UI updates properly
    window.location.reload();
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = localStorage.getItem(this.tokenKey);
    return !!token;
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Set current user (for profile updates)
  setCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user);
    if (user) {
      this.storeUserData(user);
    }
  }

  // Store user data in localStorage
  private storeUserData(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  // Get auth token
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  // Validate token with backend
  validateToken(): Observable<AuthResponse> {
    const token = this.getToken();
    if (!token) {
      return of({ success: false, message: 'No token found' });
    }

    return this.http.post<AuthResponse>(`${this.apiUrl}/customer/auth/validate-token`, { token })
      .pipe(
        map(response => {
          if (!response.success) {
            this.logout();
          }
          return response;
        }),
        catchError(error => {
          console.error('Token validation error:', error);
          this.logout();
          return of({ success: false, message: 'Token validation failed' });
        })
      );
  }

  // Generate guest session ID
  generateGuestSessionId(): string {
    return 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Get or create guest session ID
  getGuestSessionId(): string {
    let sessionId = localStorage.getItem('guest_session_id');
    if (!sessionId) {
      sessionId = this.generateGuestSessionId();
      localStorage.setItem('guest_session_id', sessionId);
    }
    return sessionId;
  }

  // Clear guest session
  clearGuestSession(): void {
    localStorage.removeItem('guest_session_id');
  }

  // Private helper methods
  private setStoredData(token: string, user: User): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  private clearStoredData(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    // Clear any in-progress checkout session when logging out
    try { localStorage.removeItem('sun-racing-checkout'); } catch {}
    // Clear any locally cached cart snapshot for guest mode
    try { localStorage.removeItem('sun-racing-cart'); } catch {}
    // Reset guest session id so a fresh guest cart starts clean
    try { localStorage.removeItem('guest_session_id'); } catch {}
  }

  // Check if user has specific role
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user ? user.role === role : false;
  }

  // Check if user is admin
  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  // Check if user is manager
  isManager(): boolean {
    return this.hasRole('MANAGER');
  }
}
