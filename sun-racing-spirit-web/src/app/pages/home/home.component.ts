import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Product, ProductFilters } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { ProductListComponent } from '../../components/product-list/product-list.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ProductListComponent],
  template: `
    <div class="home-page">
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-content">
          <div class="hero-text">
            <h1 class="hero-title">
              <span class="title-line">Sun Racing Spirit</span>
              <span class="title-line">Premium Scooter Parts</span>
            </h1>
            <p class="hero-description">
              High-performance aftermarket parts for scooters and small motorcycles. 
              From CVT components to performance exhausts, enhance your ride with our premium Taiwanese quality.
            </p>
            <div class="hero-actions">
              <a routerLink="/products" class="btn btn-primary btn-large">
                Shop Products
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"></path>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>


      <!-- Featured Products -->
      <section class="featured-section">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title">Featured Products</h2>
            <a routerLink="/products" class="view-all-link">
              View All Products
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
          <div *ngIf="loading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading featured products...</p>
          </div>
          <div *ngIf="!loading && featuredProducts.length === 0" class="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <h3>No Featured Products Yet</h3>
            <p>Check back soon for our latest featured products!</p>
            <a routerLink="/products" class="btn btn-primary">Browse All Products</a>
          </div>
          <app-product-list
            *ngIf="!loading && featuredProducts.length > 0"
            [products]="featuredProducts"
            [loading]="loading"
          ></app-product-list>
        </div>
      </section>

      <!-- New Arrivals -->
      <section class="new-arrivals-section">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title">New Arrivals</h2>
            <a routerLink="/products" class="view-all-link">
              View All New
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
          <div *ngIf="loading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading new arrivals...</p>
          </div>
          <div *ngIf="!loading && newArrivals.length === 0" class="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <h3>No New Arrivals Yet</h3>
            <p>New products will appear here when they're added!</p>
            <a routerLink="/products" class="btn btn-primary">Browse All Products</a>
          </div>
          <app-product-list
            *ngIf="!loading && newArrivals.length > 0"
            [products]="newArrivals"
            [loading]="loading"
          ></app-product-list>
        </div>
      </section>

      <!-- Newsletter Section -->
      <section class="newsletter-section">
        <div class="container">
          <div class="newsletter-content">
            <h2 class="newsletter-title">Stay Updated</h2>
            <p class="newsletter-description">
              Get notified about new products, special offers, and performance tips for your scooter.
            </p>
            <div class="newsletter-form">
              <input 
                type="email" 
                placeholder="Enter your email address" 
                class="newsletter-input"
                [(ngModel)]="newsletterEmail"
              >
              <button class="btn btn-accent newsletter-btn" (click)="subscribeNewsletter()">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .home-page {
      min-height: 100vh;
    }

    /* Hero Section */
    .hero-section {
      background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%);
      padding: 100px 0;
      min-height: 85vh;
      display: flex;
      align-items: center;
      position: relative;
    }

    .hero-content {
      display: flex;
      justify-content: center;
      align-items: center;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 40px;
    }

    .hero-text {
      max-width: 800px;
      width: 100%;
      text-align: center;
    }

    .hero-title {
      font-size: 3.5rem;
      font-weight: 800;
      line-height: 1.2;
      margin-bottom: 24px;
      letter-spacing: -0.01em;
    }

    .title-line {
      display: block;
      background: linear-gradient(135deg, var(--sun-orange-yellow), var(--sun-yellow));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-description {
      font-size: 1.1rem;
      color: rgba(255, 255, 255, 0.8);
      margin-bottom: 32px;
      line-height: 1.6;
      font-weight: 400;
    }

    .hero-actions {
      display: flex;
      justify-content: center;
      gap: var(--spacing-lg);
      flex-wrap: wrap;
    }

    .btn-large {
      padding: 18px 36px;
      font-size: 1.125rem;
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      border-radius: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 8px 25px rgba(255, 140, 0, 0.4);
      transition: all 0.3s ease;
    }

    .btn-large:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 35px rgba(255, 140, 0, 0.6);
    }


    .section-title {
      text-align: center;
      font-size: 3rem;
      font-weight: 800;
      margin-bottom: 60px;
      color: var(--white);
      letter-spacing: -0.02em;
      position: relative;
    }

    .section-title::after {
      content: '';
      position: absolute;
      bottom: -15px;
      left: 50%;
      transform: translateX(-50%);
      width: 80px;
      height: 4px;
      background: linear-gradient(90deg, var(--sun-orange-yellow), var(--sun-yellow));
      border-radius: 2px;
    }

    /* Featured Section */
    .featured-section {
      padding: var(--spacing-3xl) 0;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-2xl);
    }

    .view-all-link {
      color: var(--sun-orange-yellow);
      text-decoration: none;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      transition: color var(--transition-fast);
    }

    .view-all-link:hover {
      color: var(--sun-yellow);
    }

    /* New Arrivals Section */
    .new-arrivals-section {
      padding: var(--spacing-3xl) 0;
      background: var(--secondary-black);
    }

    /* Newsletter Section */
    .newsletter-section {
      padding: var(--spacing-3xl) 0;
      background: linear-gradient(135deg, var(--racing-blue), var(--racing-blue-light));
    }

    .newsletter-content {
      text-align: center;
      max-width: 600px;
      margin: 0 auto;
    }

    .newsletter-title {
      color: var(--white);
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: var(--spacing-lg);
    }

    .newsletter-description {
      color: rgba(255, 255, 255, 0.9);
      font-size: 1.125rem;
      margin-bottom: var(--spacing-2xl);
    }

    .newsletter-form {
      display: flex;
      gap: var(--spacing-md);
      max-width: 400px;
      margin: 0 auto;
    }

    .newsletter-input {
      flex: 1;
      padding: var(--spacing-md);
      border: none;
      border-radius: var(--radius-md);
      font-size: 1rem;
      background: rgba(255, 255, 255, 0.1);
      color: var(--white);
      backdrop-filter: blur(10px);
    }

    .newsletter-input::placeholder {
      color: rgba(255, 255, 255, 0.7);
    }

    .newsletter-input:focus {
      outline: none;
      background: rgba(255, 255, 255, 0.2);
    }

    .newsletter-btn {
      background: var(--white);
      color: var(--racing-blue);
      font-weight: 700;
    }

    .newsletter-btn:hover {
      background: var(--gray-100);
    }

    /* Responsive Design */
    @media (max-width: 1024px) {
      .hero-content {
        padding: 0 var(--spacing-md);
      }

      .hero-title {
        font-size: 3rem;
      }
    }

    @media (max-width: 768px) {
      .hero-content {
        padding: 0 var(--spacing-sm);
      }

      .hero-title {
        font-size: 2.5rem;
      }
    }

    @media (max-width: 768px) {
      .hero-title {
        font-size: 2.5rem;
      }

      .hero-actions {
        flex-direction: column;
        align-items: center;
      }

      .newsletter-form {
        flex-direction: column;
      }

      .section-header {
        flex-direction: column;
        gap: var(--spacing-lg);
        text-align: center;
      }
    }

    /* Loading and Empty States */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 140, 0, 0.2);
      border-top: 4px solid var(--sun-orange-yellow);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading-state p {
      color: var(--gray-400);
      font-size: 1rem;
      margin: 0;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
      color: var(--gray-400);
    }

    .empty-state svg {
      margin-bottom: 20px;
      opacity: 0.6;
      color: var(--sun-orange-yellow);
    }

    .empty-state h3 {
      color: var(--white);
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .empty-state p {
      font-size: 1rem;
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .empty-state .btn {
      padding: 12px 24px;
      font-size: 1rem;
      font-weight: 600;
    }
  `]
})
export class HomeComponent implements OnInit {
  featuredProducts: Product[] = [];
  newArrivals: Product[] = [];
  loading = false;
  newsletterEmail = '';

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private title: Title
  ) {}

  ngOnInit(): void {
    // Set page title
    this.title.setTitle('Sun Racing Spirit Philippines - Premium Scooter Parts');
    
    this.loadFeaturedProducts();
    this.loadNewArrivals();
  }

  loadFeaturedProducts(): void {
    this.loading = true;
    this.productService.getFeaturedProducts().subscribe({
      next: (products) => {
        this.featuredProducts = products;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading featured products:', error);
        this.loading = false;
      }
    });
  }

  loadNewArrivals(): void {
    this.productService.getNewArrivals().subscribe({
      next: (products) => {
        this.newArrivals = products;
      },
      error: (error) => {
        console.error('Error loading new arrivals:', error);
      }
    });
  }




  subscribeNewsletter(): void {
    if (this.newsletterEmail && this.isValidEmail(this.newsletterEmail)) {
      // Implement newsletter subscription
      alert('Thanks for subscribing!');
      this.newsletterEmail = '';
    } else {
      alert('Please enter a valid email address.');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
