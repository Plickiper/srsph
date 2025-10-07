import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, ProductFilters } from '../../models/product.model';
import { ProductCardComponent } from '../product-card/product-card.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  template: `
    <div class="product-list-container">
      <!-- Loading State -->
      <div class="loading-state" *ngIf="loading">
        <div class="loading-spinner"></div>
        <p>Loading products...</p>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!loading && products.length === 0">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M9 22C9.55228 22 10 21.5523 10 21C10 20.4477 9.55228 20 9 20C8.44772 20 8 20.4477 8 21C8 21.5523 8.44772 22 9 22Z"></path>
            <path d="M20 22C20.5523 22 21 21.5523 21 21C21 20.4477 20.5523 20 20 20C19.4477 20 19 20.4477 19 21C19 21.5523 19.4477 22 20 22Z"></path>
            <path d="M1 1H5L7.68 14.39C7.77144 14.8504 8.02191 15.264 8.38755 15.5583C8.75318 15.8526 9.2107 16.009 9.68 16H19.4C19.8693 16.009 20.3268 15.8526 20.6925 15.5583C21.0581 15.264 21.3086 14.8504 21.4 14.39L23 6H6"></path>
          </svg>
        </div>
        <h3>No Products Found</h3>
        <p>Try adjusting your filters or search terms.</p>
        <button class="btn btn-primary" (click)="onClearFilters()">Clear Filters</button>
      </div>

      <!-- Product Grid -->
      <div class="product-grid" *ngIf="!loading && products.length > 0">
        <app-product-card
          *ngFor="let product of products; trackBy: trackByProductId"
          [product]="product"
        ></app-product-card>
      </div>

      <!-- Load More Button -->
      <div class="load-more-container" *ngIf="!loading && products.length > 0 && hasMore">
        <button class="btn btn-outline load-more-btn" (click)="onLoadMore()">
          Load More Products
        </button>
      </div>
    </div>
  `,
  styles: [`
    .product-list-container {
      min-height: 400px;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-3xl);
      text-align: center;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid var(--gray-700);
      border-top: 4px solid var(--accent-red);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: var(--spacing-lg);
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-3xl);
      text-align: center;
    }

    .empty-icon {
      color: var(--gray-500);
      margin-bottom: var(--spacing-lg);
    }

    .empty-state h3 {
      color: var(--white);
      margin-bottom: var(--spacing-sm);
    }

    .empty-state p {
      color: var(--gray-400);
      margin-bottom: var(--spacing-lg);
    }

    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 200px));
      max-width: 1200px;
      margin: 0 auto;
      gap: var(--spacing-md);
      padding: var(--spacing-lg) 0;
      justify-content: start;
    }

    .load-more-container {
      display: flex;
      justify-content: center;
      padding: var(--spacing-2xl) 0;
    }

    .load-more-btn {
      padding: var(--spacing-md) var(--spacing-2xl);
      font-size: 1rem;
    }

    /* Responsive Grid */
    @media (max-width: 1200px) {
      .product-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 200px));
        max-width: 1000px;
      }
    }

    @media (max-width: 768px) {
      .product-grid {
        grid-template-columns: repeat(auto-fill, minmax(150px, 180px));
        max-width: 800px;
        gap: var(--spacing-sm);
      }
    }

    @media (max-width: 480px) {
      .product-grid {
        grid-template-columns: repeat(auto-fill, minmax(140px, 160px));
        max-width: 100%;
        gap: var(--spacing-xs);
      }
    }

    /* Animation for product cards */
    .product-grid app-product-card {
      animation: fadeInUp 0.6s ease-out;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class ProductListComponent implements OnInit {
  @Input() products: Product[] = [];
  @Input() loading = false;
  @Input() hasMore = false;
  @Output() loadMore = new EventEmitter<void>();
  @Output() clearFilters = new EventEmitter<void>();

  ngOnInit(): void {
    // Component initialization
  }

  trackByProductId(index: number, product: Product): number {
    return product.id;
  }




  onLoadMore(): void {
    this.loadMore.emit();
  }

  onClearFilters(): void {
    this.clearFilters.emit();
  }
}
