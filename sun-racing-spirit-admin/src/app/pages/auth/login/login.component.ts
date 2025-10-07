import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminAuthService, LoginResponse } from '../../../services/admin-auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="brand-logo">
            <div class="brand-sun">SUN</div>
            <div class="brand-tagline">
              <div class="brand-racing">RACING SPIRIT</div>
              <div class="brand-philippines">ADMIN LOGIN</div>
            </div>
          </div>
        </div>
        <div class="login-content">
          <form (ngSubmit)="onLogin()" #loginForm="ngForm">
            <div class="form-group">
              <label for="usernameOrEmail" class="form-label">Username or Email</label>
              <input 
                type="text" 
                id="usernameOrEmail"
                name="usernameOrEmail"
                class="form-input" 
                placeholder="Enter your username or email"
                [(ngModel)]="loginData.usernameOrEmail"
                required
                #usernameOrEmailInput="ngModel"
              >
              <div *ngIf="usernameOrEmailInput.invalid && usernameOrEmailInput.touched" class="error-message">
                Username or email is required
              </div>
            </div>

            <div class="form-group">
              <label for="password" class="form-label">Password</label>
              <input 
                type="password" 
                id="password"
                name="password"
                class="form-input" 
                placeholder="Enter your password"
                [(ngModel)]="loginData.password"
                required
                minlength="6"
                #passwordInput="ngModel"
              >
              <div *ngIf="passwordInput.invalid && passwordInput.touched" class="error-message">
                <span *ngIf="passwordInput.errors?.['required']">Password is required</span>
                <span *ngIf="passwordInput.errors?.['minlength']">Password must be at least 6 characters</span>
              </div>
            </div>

            <div *ngIf="errorMessage" class="error-container">
              <p>{{ errorMessage }}</p>
            </div>

            <button 
              type="submit" 
              class="btn btn-primary login-btn" 
              [disabled]="loginForm.invalid || isLoading"
            >
              <span *ngIf="isLoading" class="spinner"></span>
              {{ isLoading ? 'Signing In...' : 'Sign In' }}
            </button>
          </form>

          <div class="login-info">
            <p class="info-text">Admin Access Only</p>
            <p class="info-subtitle">Contact your Super Admin for account access</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    }
    
    .login-card {
      width: 100%;
      max-width: 400px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 40px;
      backdrop-filter: blur(10px);
    }
    
    .login-header {
      text-align: center;
      margin-bottom: 40px;
    }
    
    .brand-logo {
      display: flex;
      flex-direction: column;
      align-items: center;
      line-height: 1;
    }

    .brand-sun {
      font-family: 'Inter', sans-serif;
      font-size: 2.5rem;
      font-weight: 900;
      color: #ff8c00;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      letter-spacing: 0.08em;
      line-height: 0.9;
      margin-bottom: 8px;
    }

    .brand-tagline {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .brand-racing {
      font-family: 'Inter', sans-serif;
      font-size: 0.8rem;
      font-weight: 700;
      color: white;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      line-height: 1;
      margin-bottom: 2px;
    }

    .brand-philippines {
      font-family: 'Inter', sans-serif;
      font-size: 0.7rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.8);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      line-height: 1;
    }
    
    .login-content {
      color: rgba(255, 255, 255, 0.8);
    }
    
    .form-group {
      margin-bottom: 24px;
      text-align: left;
    }
    
    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: white;
      font-size: 0.9rem;
    }
    
    .form-input {
      width: 100%;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: white;
      font-size: 0.9rem;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
    }
    
    .form-input::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }
    
    .form-input:focus {
      outline: none;
      border-color: #ff8c00;
      box-shadow: 0 0 0 3px rgba(255, 140, 0, 0.2);
    }
    
    .error-message {
      margin-top: 6px;
      font-size: 0.8rem;
      color: #ef4444;
    }
    
    .error-container {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 20px;
      text-align: center;
    }
    
    .error-container p {
      margin: 0;
      color: #ef4444;
      font-size: 0.9rem;
    }
    
    .login-btn {
      width: 100%;
      padding: 12px;
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 20px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    
    .login-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 0.8s linear infinite;
      margin-right: 8px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .login-info {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .info-text {
      margin: 0 0 4px 0;
      font-weight: 600;
      color: #ff8c00;
      font-size: 0.9rem;
    }
    
    .info-subtitle {
      margin: 0;
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.6);
    }
  `]
})
export class LoginComponent {
  loginData = {
    usernameOrEmail: '',
    password: ''
  };
  
  isLoading = false;
  errorMessage = '';

  constructor(
    private authService: AdminAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onLogin(): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.loginData.usernameOrEmail, this.loginData.password)
      .subscribe({
        next: (response: LoginResponse) => {
          this.isLoading = false;
          
          if (response.success) {
            // Get return URL or default to dashboard
            const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
            this.router.navigate([returnUrl]);
          } else {
            this.errorMessage = response.error || 'Login failed';
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Login error:', error);
          
          // Use the specific error message from the backend if available
          if (error.error && error.error.error) {
            this.errorMessage = error.error.error;
          } else if (error.status === 401) {
            this.errorMessage = 'Invalid username/email or password. Please check your credentials and try again.';
          } else if (error.status === 403) {
            this.errorMessage = 'Access denied. Admin privileges required. Please contact your Super Admin for account access.';
          } else if (error.status === 0) {
            this.errorMessage = 'Unable to connect to server. Please try again later.';
          } else {
            this.errorMessage = 'An unexpected error occurred. Please try again.';
          }
        }
      });
  }
}