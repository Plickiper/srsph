import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AdminNavComponent } from '../admin-nav/admin-nav.component';
import { AdminAuthService } from '../../services/admin-auth.service';
import { SessionService } from '../../services/session.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, AdminNavComponent],
  template: `
    <div class="admin-layout">
      <!-- Show navigation only if authenticated and not on login page -->
      <app-admin-nav *ngIf="showNavigation" [class.collapsed]="sidebarCollapsed" [class.mobile-hidden]="sidebarCollapsed && isMobile" [collapsed]="sidebarCollapsed" (toggleSidebarEvent)="toggleSidebar()"></app-admin-nav>
      
      <!-- Mobile overlay -->
      <div *ngIf="showNavigation && isMobile && !sidebarCollapsed" class="mobile-overlay" (click)="toggleSidebar()"></div>
      
      <main class="main-content" [class.full-width]="!showNavigation" [class.sidebar-collapsed]="sidebarCollapsed">
        <!-- Floating toggle button - only visible when sidebar is collapsed -->
        <div *ngIf="showNavigation && sidebarCollapsed" class="floating-toggle-container">
          <button class="floating-toggle" (click)="toggleSidebar()" title="Show sidebar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
        </div>
        
        <!-- Session Status Indicator -->
        <div *ngIf="showNavigation" class="session-status" [class.active]="isSessionActive$ | async">
          <div class="status-indicator">
            <div class="status-dot"></div>
            <span class="status-text">Session Active</span>
          </div>
        </div>
        
        
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .admin-layout {
      display: flex;
      min-height: 100vh;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      position: relative;
    }
    
    .main-content {
      flex: 1;
      margin-left: 280px;
      transition: margin-left 0.3s ease;
      position: relative;
    }
    
    .main-content.full-width {
      margin-left: 0;
    }
    
    .main-content.sidebar-collapsed {
      margin-left: 0 !important;
      transition: margin-left 0.3s ease;
    }
    
    /* Sidebar collapse styles - slide to the left */
    app-admin-nav.collapsed .admin-nav {
      transform: translateX(-100%) !important;
      transition: transform 0.3s ease;
    }
    
    /* More specific selectors to ensure they work */
    .admin-layout app-admin-nav.collapsed .admin-nav {
      transform: translateX(-100%) !important;
    }
    
    /* Global styles to override any encapsulation issues */
    :host ::ng-deep app-admin-nav.collapsed .admin-nav {
      transform: translateX(-100%) !important;
    }
    
    
    

    /* Floating toggle button - only visible when sidebar is collapsed */
    .floating-toggle-container {
      position: fixed;
      top: 50%;
      left: 0;
      transform: translateY(-50%);
      z-index: 1000;
    }
    
    .floating-toggle {
      background: rgba(255, 140, 0, 0.9);
      border: 2px solid #ff8c00;
      border-left: none;
      border-radius: 0 6px 6px 0;
      padding: 8px;
      color: white;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(255, 140, 0, 0.3);
      font-weight: 600;
      min-width: 36px;
      min-height: 36px;
    }
    
    .floating-toggle:hover {
      background: rgba(255, 140, 0, 1);
      border-color: #ff8c00;
      border-left: none;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(255, 140, 0, 0.4);
    }

    /* Mobile overlay */
    .mobile-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 40;
    }
    
    /* Responsive breakpoints */
    @media (max-width: 1024px) {
      .main-content {
        margin-left: 0;
      }
      
      .main-content.sidebar-collapsed {
        margin-left: 0;
      }
    }
    
    @media (max-width: 768px) {
      .main-content {
        padding: 0;
      }
      
      .sidebar-toggle-container {
        top: 15px;
        left: 15px;
      }
      
      .sidebar-toggle {
        padding: 10px;
      }
    }

    /* Session Status Indicator */
    .session-status {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      opacity: 0;
      transform: translateY(-10px);
      transition: all 0.3s ease;
    }

    .session-status.active {
      opacity: 1;
      transform: translateY(0);
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 20px;
      padding: 8px 16px;
      backdrop-filter: blur(10px);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      animation: pulse 2s infinite;
    }

    .status-text {
      font-size: 0.8rem;
      font-weight: 500;
      color: #10b981;
    }

    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
      }
    }
  `]
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  showNavigation = false;
  sidebarCollapsed = false;
  isMobile = false;
  isSessionActive$: Observable<boolean>;

  constructor(
    private authService: AdminAuthService,
    private router: Router,
    private sessionService: SessionService
  ) {
    this.isSessionActive$ = this.sessionService.getActivityStatus();
  }

  ngOnInit(): void {
    // Check initial screen size
    this.checkScreenSize();
    
    // Listen to window resize events
    window.addEventListener('resize', () => this.checkScreenSize());
    
    // Listen to authentication state and route changes
    this.authService.isAuthenticated$.subscribe(isAuth => {
      this.updateNavigationVisibility(isAuth);
    });

    // Also listen to route changes
    this.router.events.subscribe(() => {
      this.updateNavigationVisibility(this.authService.isAuthenticated());
    });
  }

  private checkScreenSize(): void {
    this.isMobile = window.innerWidth <= 1024;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  private updateNavigationVisibility(isAuthenticated: boolean): void {
    const currentUrl = this.router.url;
    // Show navigation only if authenticated and not on login page
    this.showNavigation = isAuthenticated && !currentUrl.startsWith('/login');
  }

  ngOnDestroy(): void {
    // Cleanup is handled by the session service
  }
}
