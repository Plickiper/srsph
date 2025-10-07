import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminAuthService, AdminUser, AdminPermissions } from '../../services/admin-auth.service';

@Component({
  selector: 'app-admin-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="admin-nav">
      <div class="nav-header">
        <div class="nav-logo">
          <div class="brand-logo">
            <div class="brand-sun">SUN</div>
            <div class="brand-tagline">
              <div class="brand-racing">RACING SPIRIT</div>
              <div class="brand-philippines">ADMIN PANEL</div>
            </div>
          </div>
        </div>
        <!-- Toggle button integrated into sidebar -->
        <button class="sidebar-toggle" (click)="toggleSidebar()" [title]="collapsed ? 'Expand sidebar' : 'Collapse sidebar'">
          <!-- Arrow left icon for expanded state (to collapse) -->
          <svg *ngIf="!collapsed" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15,18 9,12 15,6"></polyline>
          </svg>
          <!-- Arrow right icon for collapsed state (to expand) -->
          <svg *ngIf="collapsed" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9,18 15,12 9,6"></polyline>
          </svg>
        </button>
      </div>
      
      <div class="nav-menu">
        <a routerLink="/dashboard" routerLinkActive="active" class="nav-item" [title]="collapsed ? 'Dashboard' : ''">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span>Dashboard</span>
        </a>
        
        <a routerLink="/products" routerLinkActive="active" class="nav-item" [title]="collapsed ? 'Products' : ''">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <span>Products</span>
        </a>
        
        <a routerLink="/orders" routerLinkActive="active" class="nav-item" [title]="collapsed ? 'Orders' : ''">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 22C9.55228 22 10 21.5523 10 21C10 20.4477 9.55228 20 9 20C8.44772 20 8 20.4477 8 21C8 21.5523 8.44772 22 9 22Z"></path>
            <path d="M20 22C20.5523 22 21 21.5523 21 21C21 20.4477 20.5523 20 20 20C19.4477 20 19 20.4477 19 21C19 21.5523 19.4477 22 20 22Z"></path>
            <path d="M1 1H5L7.68 14.39C7.77144 14.8504 8.02191 15.264 8.38755 15.5583C8.75318 15.8526 9.2107 16.009 9.68 16H19.4C19.8693 16.009 20.3268 15.8526 20.6925 15.5583C21.0581 15.264 21.3086 14.8504 21.4 14.39L23 6H6"></path>
          </svg>
          <span>Orders</span>
        </a>
        
        <a routerLink="/users" routerLinkActive="active" class="nav-item" *ngIf="canManageUsers" [title]="collapsed ? 'Staff' : ''">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Staff</span>
        </a>
        
        <a routerLink="/audit-log" routerLinkActive="active" class="nav-item" *ngIf="canManageUsers" [title]="collapsed ? 'Audit Log' : ''">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14,2 14,8 20,8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10,9 9,9 8,9"></polyline>
          </svg>
          <span>Audit Log</span>
        </a>
      </div>
      
      <div class="nav-footer">
        <div class="user-info">
          <div class="user-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="user-details">
            <div class="user-name">{{ currentUser?.firstName || 'Admin' }} {{ currentUser?.lastName || '' }}</div>
            <div class="user-role">{{ currentUser?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Staff' }}</div>
          </div>
        </div>
        
        <button class="logout-btn" (click)="logout()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16,17 21,12 16,7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    </nav>
  `,
  styles: [`
    .admin-nav {
      width: 280px;
      height: 100vh;
      background: linear-gradient(180deg, #1e3a8a 0%, #0f172a 100%);
      border-right: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      position: fixed;
      left: 0;
      top: 0;
      z-index: 100;
      transition: all 0.3s ease;
    }
    
    .admin-nav.collapsed {
      width: 80px !important;
      overflow: hidden;
    }
    
    /* More specific selector to ensure it works */
    nav.admin-nav.collapsed {
      width: 80px !important;
      overflow: hidden;
    }
    
    /* Even more specific with higher specificity */
    .admin-layout app-admin-nav.admin-nav.collapsed {
      width: 80px !important;
      overflow: hidden;
    }
    
    .admin-nav.mobile-hidden {
      transform: translateX(-100%);
    }
    
    @media (max-width: 1024px) {
      .admin-nav {
        transform: translateX(-100%);
      }
      
      .admin-nav:not(.mobile-hidden) {
        transform: translateX(0);
      }
      
      /* On mobile, collapsed state should still be hidden */
      .admin-nav.collapsed.mobile-hidden {
        transform: translateX(-100%);
      }
    }
    
    .nav-header {
      padding: 30px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      transition: padding 0.3s ease;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    
    .sidebar-toggle {
      background: rgba(255, 140, 0, 0.2);
      border: 1px solid rgba(255, 140, 0, 0.3);
      border-radius: 6px;
      padding: 8px;
      color: #ff8c00;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      min-height: 32px;
    }
    
    .sidebar-toggle:hover {
      background: rgba(255, 140, 0, 0.3);
      border-color: rgba(255, 140, 0, 0.5);
      color: #ff8c00;
    }
    
    .brand-logo {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      line-height: 1;
      transition: all 0.3s ease;
    }
    
    .admin-nav.collapsed .brand-logo {
      align-items: center;
    }
    
    .admin-nav.collapsed .brand-tagline {
      display: none;
    }

    .brand-sun {
      font-family: 'Inter', sans-serif;
      font-size: 2.2rem;
      font-weight: 900;
      color: #ff8c00;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      letter-spacing: 0.08em;
      line-height: 0.9;
      margin-bottom: 4px;
    }

    .brand-tagline {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .brand-racing {
      font-family: 'Inter', sans-serif;
      font-size: 0.7rem;
      font-weight: 700;
      color: white;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      line-height: 1;
      margin-bottom: 2px;
    }

    .brand-philippines {
      font-family: 'Inter', sans-serif;
      font-size: 0.6rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.8);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      line-height: 1;
    }
    
    .nav-menu {
      flex: 1;
      padding: 20px 0;
      overflow-y: auto;
    }
    
    .nav-item {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 15px 25px;
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      transition: all 0.3s ease;
      border-left: 3px solid transparent;
      font-weight: 500;
    }
    
    .admin-nav.collapsed .nav-item {
      padding: 15px 10px;
      justify-content: center;
    }
    
    .admin-nav.collapsed .nav-item span {
      display: none;
    }
    
    .nav-item:hover {
      background: rgba(255, 140, 0, 0.1);
      color: #ff8c00;
      border-left-color: #ff8c00;
    }
    
    .nav-item.active {
      background: rgba(255, 140, 0, 0.15);
      color: #ff8c00;
      border-left-color: #ff8c00;
    }
    
    .nav-item svg {
      flex-shrink: 0;
    }
    
    .nav-footer {
      padding: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.3s ease;
    }
    
    .admin-nav.collapsed .nav-footer {
      padding: 20px 10px;
      flex-direction: column;
      gap: 10px;
    }
    
    .admin-nav.collapsed .user-details {
      display: none;
    }
    
    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .user-avatar {
      width: 40px;
      height: 40px;
      background: rgba(255, 140, 0, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ff8c00;
    }
    
    .user-details {
      display: flex;
      flex-direction: column;
    }
    
    .user-name {
      color: white;
      font-weight: 600;
      font-size: 0.9rem;
    }
    
    .user-role {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.75rem;
    }
    
    .logout-btn {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      transition: all 0.3s ease;
    }
    
    .logout-btn:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
  `]
})
export class AdminNavComponent implements OnInit {
  @Input() collapsed: boolean = false;
  @Output() toggleSidebarEvent = new EventEmitter<void>();
  
  currentUser: AdminUser | null = null;
  canManageUsers = false;

  constructor(private authService: AdminAuthService) {}

  ngOnInit(): void {
    // Subscribe to current user and permissions
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    this.authService.permissions$.subscribe(permissions => {
      this.canManageUsers = permissions?.canManageUsers || false;
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        window.location.href = '/login';
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Still redirect even if logout fails
        window.location.href = '/login';
      }
    });
  }

  toggleSidebar(): void {
    this.toggleSidebarEvent.emit();
  }
}
