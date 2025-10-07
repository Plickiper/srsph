import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { ProductService } from '../../services/product.service';
import { Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <nav class="navbar">
      <div class="container">
        <div class="navbar-content">
          <!-- Logo -->
          <div class="navbar-brand">
            <a routerLink="/" class="brand-link">
              <div class="brand-logo">
                <div class="brand-sun">SUN</div>
                <div class="brand-tagline">
                  <div class="brand-racing">RACING SPIRIT</div>
                  <div class="brand-philippines">PHILIPPINES <span class="checkered-flag">🏁</span></div>
                </div>
              </div>
            </a>
            <!-- Page Title (only on specific pages) -->
            <div class="page-title" *ngIf="isCartPage">
              <div class="divider"></div>
              <span class="title-text">Shopping Cart</span>
            </div>
            <div class="page-title" *ngIf="isProfilePage">
              <div class="divider"></div>
              <span class="title-text">Profile</span>
            </div>
            <div class="page-title" *ngIf="isCheckoutPage">
              <div class="divider"></div>
              <span class="title-text">Checkout</span>
            </div>
            <div class="page-title" *ngIf="isOrdersPage">
              <div class="divider"></div>
              <span class="title-text">Orders</span>
            </div>
          </div>

          <!-- Search Bar -->
          <div class="navbar-search">
            <div class="search-container">
              <input 
                type="text" 
                class="search-input" 
                placeholder="Search parts..."
                [(ngModel)]="searchQuery"
                (keyup.enter)="onSearch()"
              >
              <button class="search-btn" (click)="onSearch()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
              </button>
            </div>
          </div>

          <!-- Navigation Links -->
          <div class="navbar-nav">
            <!-- Cart and Login -->
            <a routerLink="/cart" class="nav-link cart-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 22C9.55228 22 10 21.5523 10 21C10 20.4477 9.55228 20 9 20C8.44772 20 8 20.4477 8 21C8 21.5523 8.44772 22 9 22Z"></path>
                <path d="M20 22C20.5523 22 21 21.5523 21 21C21 20.4477 20.5523 20 20 20C19.4477 20 19 20.4477 19 21C19 21.5523 19.4477 22 20 22Z"></path>
                <path d="M1 1H5L7.68 14.39C7.77144 14.8504 8.02191 15.264 8.38755 15.5583C8.75318 15.8526 9.2107 16.009 9.68 16H19.4C19.8693 16.009 20.3268 15.8526 20.6925 15.5583C21.0581 15.264 21.3086 14.8504 21.4 14.39L23 6H6"></path>
              </svg>
              <span class="cart-count" *ngIf="cartItemCount > 0">{{ cartItemCount }}</span>
            </a>
            
            <!-- User Menu -->
            <div class="user-menu" *ngIf="isAuthenticated$ | async; else loginButton">
              <div class="user-dropdown">
                <button class="user-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </button>
                <div class="dropdown-menu">
                  <a routerLink="/profile" class="dropdown-item">Profile</a>
                  <a routerLink="/orders" class="dropdown-item">Orders</a>
                  <button class="dropdown-item" (click)="logout()">Logout</button>
                </div>
              </div>
            </div>
            
            <ng-template #loginButton>
              <a routerLink="/login" class="nav-link login-link">Login</a>
            </ng-template>
          </div>

          <!-- Mobile Menu Toggle -->
          <button class="mobile-menu-toggle" (click)="toggleMobileMenu()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Mobile Menu -->
        <div class="mobile-menu" [class.active]="mobileMenuOpen">
          <a routerLink="/products" class="mobile-nav-link" (click)="closeMobileMenu()">Products</a>
          <a routerLink="/cart" class="mobile-nav-link" (click)="closeMobileMenu()">Cart</a>
          <a routerLink="/login" class="mobile-nav-link" (click)="closeMobileMenu()" *ngIf="!(isAuthenticated$ | async)">Login</a>
          <a routerLink="/profile" class="mobile-nav-link" (click)="closeMobileMenu()" *ngIf="isAuthenticated$ | async">Profile</a>
          <a routerLink="/orders" class="mobile-nav-link" (click)="closeMobileMenu()" *ngIf="isAuthenticated$ | async">Orders</a>
          <button class="mobile-nav-link" (click)="logout(); closeMobileMenu()" *ngIf="isAuthenticated$ | async">Logout</button>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      background: var(--primary-black);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      width: 100%;
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .navbar-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-md) 0;
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
    }

    .navbar-brand {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .brand-link {
      text-decoration: none;
      color: var(--white);
    }

    .brand-logo {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .brand-sun {
      font-family: var(--font-secondary);
      font-size: 1.8rem;
      font-weight: 900;
      color: var(--sun-orange-yellow);
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      letter-spacing: 0.1em;
      line-height: 1;
    }

    .brand-tagline {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      margin-top: 2px;
    }

    .brand-racing {
      font-family: var(--font-primary);
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--white);
      text-transform: uppercase;
      letter-spacing: 0.15em;
      line-height: 1;
    }

    .brand-logo {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      line-height: 1;
    }

    .brand-sun {
      font-family: var(--font-secondary);
      font-size: 2.2rem;
      font-weight: 900;
      color: var(--sun-orange-yellow);
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      letter-spacing: 0.08em;
      line-height: 0.9;
      margin-bottom: 2px;
    }

    .brand-tagline {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .brand-racing {
      font-family: var(--font-primary);
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--white);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      line-height: 1;
      margin-bottom: 1px;
    }

    .brand-philippines {
      font-family: var(--font-primary);
      font-size: 0.65rem;
      font-weight: 600;
      color: var(--white);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      line-height: 1;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .checkered-flag {
      font-size: 0.8rem;
      filter: brightness(1.2);
    }

    .page-title {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .divider {
      width: 1px;
      height: 24px;
      background: var(--gray-600);
    }

    .title-text {
      color: var(--gray-300);
      font-size: 1rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .navbar-search {
      flex: 1;
      max-width: 500px;
      margin: 0 var(--spacing-xl);
    }

    .search-container {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-input {
      width: 100%;
      padding: var(--spacing-sm) var(--spacing-md);
      padding-right: 50px;
      background: var(--secondary-black);
      border: 2px solid var(--gray-700);
      border-radius: var(--radius-lg);
      color: var(--white);
      font-size: 0.875rem;
      transition: border-color var(--transition-fast);
    }

    .search-input:focus {
      outline: none;
      border-color: var(--sun-orange-yellow);
    }

    .search-btn {
      position: absolute;
      right: var(--spacing-sm);
      background: none;
      border: none;
      color: var(--gray-400);
      cursor: pointer;
      padding: var(--spacing-xs);
      transition: color var(--transition-fast);
    }

    .search-btn:hover {
      color: var(--sun-orange-yellow);
    }

    .navbar-nav {
      display: flex;
      align-items: center;
      gap: var(--spacing-lg);
    }

    .nav-link {
      color: var(--white);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      transition: color var(--transition-fast);
      position: relative;
    }

    .nav-link:hover {
      color: var(--sun-orange-yellow);
    }

    .cart-link {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .cart-count {
      position: absolute;
      top: -6px;
      right: -6px;
      background: linear-gradient(135deg, var(--sun-orange-yellow), var(--sun-yellow));
      color: var(--white);
      font-size: 0.7rem;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(255, 140, 0, 0.3);
    }

    .user-menu {
      position: relative;
    }

    .user-btn {
      background: none;
      border: none;
      color: var(--white);
      cursor: pointer;
      padding: var(--spacing-xs);
      border-radius: var(--radius-md);
      transition: background-color var(--transition-fast);
    }

    .user-btn:hover {
      background: var(--gray-800);
    }

    .dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      background: var(--secondary-black);
      border: 1px solid var(--gray-700);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      min-width: 150px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px);
      transition: all var(--transition-fast);
    }

    .user-dropdown:hover .dropdown-menu {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .dropdown-item {
      display: block;
      padding: var(--spacing-sm) var(--spacing-md);
      color: var(--white);
      text-decoration: none;
      font-size: 0.875rem;
      transition: background-color var(--transition-fast);
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      cursor: pointer;
    }

    .dropdown-item:hover {
      background: var(--gray-800);
    }

    .login-link {
      background: linear-gradient(135deg, var(--sun-orange-yellow), var(--sun-yellow));
      color: var(--white);
      padding: 10px 20px;
      border-radius: 25px;
      transition: all 0.3s ease;
      font-weight: 500;
      font-size: 0.9rem;
      box-shadow: 0 4px 15px rgba(255, 140, 0, 0.3);
    }

    .login-link:hover {
      background: linear-gradient(135deg, var(--sun-yellow), var(--sun-orange-yellow));
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(255, 140, 0, 0.4);
    }

    .mobile-menu-toggle {
      display: none;
      background: none;
      border: none;
      color: var(--white);
      cursor: pointer;
      padding: var(--spacing-sm);
    }

    .mobile-menu {
      display: none;
      flex-direction: column;
      background: var(--secondary-black);
      border-top: 1px solid var(--gray-800);
      padding: var(--spacing-lg);
      gap: var(--spacing-md);
    }

    .mobile-menu.active {
      display: flex;
    }

    .mobile-nav-link {
      color: var(--white);
      text-decoration: none;
      font-weight: 500;
      padding: var(--spacing-sm) 0;
      border: none;
      background: none;
      text-align: left;
      cursor: pointer;
    }

    @media (max-width: 768px) {
      .navbar-search {
        display: none;
      }

      .navbar-nav .nav-link:not(.cart-link) {
        display: none;
      }

      .mobile-menu-toggle {
        display: block;
      }

      .mobile-menu {
        display: none;
      }
    }
  `]
})
export class NavbarComponent implements OnInit {
  searchQuery = '';
  cartItemCount = 0;
  mobileMenuOpen = false;
  isAuthenticated$: Observable<boolean>;
  isCartPage = false;
  isProfilePage = false;
  isCheckoutPage = false;
  isOrdersPage = false;

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private productService: ProductService,
    private router: Router
  ) {
    this.isAuthenticated$ = this.authService.currentUser$.pipe(
      map(user => !!user)
    );
  }

  ngOnInit(): void {
    this.cartService.cartItems$.subscribe(items => {
      this.cartItemCount = this.cartService.getCartItemCount();
    });

    // Check if current route is cart page
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const url = (event as NavigationEnd).url;
      this.isCartPage = url.startsWith('/cart');
      this.isProfilePage = url.startsWith('/profile');
      this.isCheckoutPage = url.startsWith('/checkout');
      this.isOrdersPage = url.startsWith('/orders');
    });

    // Check initial route
    this.isCartPage = this.router.url.startsWith('/cart');
    this.isProfilePage = this.router.url.startsWith('/profile');
    this.isCheckoutPage = this.router.url.startsWith('/checkout');
    this.isOrdersPage = this.router.url.startsWith('/orders');
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/products'], { queryParams: { search: this.searchQuery } });
    } else {
      // Clear search when search query is empty
      this.router.navigate(['/products'], { queryParams: {} });
    }
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  logout(): void {
    this.authService.logout();
    // The auth service will handle page refresh
  }
}