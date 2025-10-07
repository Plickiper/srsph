import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss']
})
export class ProductCardComponent implements OnInit, OnDestroy {
  @Input() product!: Product;
  
  // Live rating data
  liveRating = 0;
  liveReviewCount = 0;
  ratingLoaded = false;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadLiveRatingData();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  onCardClick(): void {
    this.router.navigate(['/product', this.product.id]);
  }

  // Load live rating data from the ratings API
  loadLiveRatingData(): void {
    if (!this.product?.id) return;
    
    this.http.get<any>(`http://localhost:8080/api/ratings/product/${this.product.id}/stats`).subscribe({
      next: (stats) => {
        this.liveRating = stats.averageRating || 0;
        this.liveReviewCount = stats.totalRatings || 0;
        this.ratingLoaded = true;
      },
      error: (error) => {
        console.error('Error loading rating stats for product card:', error);
        this.liveRating = 0;
        this.liveReviewCount = 0;
        this.ratingLoaded = true;
      }
    });
  }

  // Get the current rating (live data if available, fallback to cached data)
  getCurrentRating(): number {
    return this.ratingLoaded ? this.liveRating : (this.product?.rating || 0);
  }

  // Get the current review count (live data if available, fallback to cached data)
  getCurrentReviewCount(): number {
    return this.ratingLoaded ? this.liveReviewCount : (this.product?.reviewCount || 0);
  }



  isNewArrival(): boolean {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(this.product.createdAt) > thirtyDaysAgo;
  }

  isOnSale(): boolean {
    // Mock sale logic - in real app this would come from backend
    return this.product.price < 100;
  }

  getOriginalPrice(): number {
    // Mock original price - in real app this would come from backend
    return this.product.price * 1.3;
  }

  getPlaceholderImage(): string {
    return 'https://via.placeholder.com/400x400/1a1a1a/ffffff?text=No+Image';
  }

  onImageError(event: any): void {
    event.target.src = this.getPlaceholderImage();
  }

  getStarArray(): number[] {
    return [1, 2, 3, 4, 5];
  }

  formatSoldCount(count: number): string {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  }

  // Variant pricing methods
  hasVariants(): boolean {
    // Check if product has variants array or compatibility string
    return !!(this.product && (
      (this.product.variants && this.product.variants.length > 0) ||
      (this.product.compatibility && this.product.compatibility.trim().length > 0)
    ));
  }

  getPriceRange(): string {
    if (!this.product) {
      return '₱0';
    }
    
    if (!this.hasVariants()) {
      return `₱${(this.product.price || 0).toLocaleString()}`;
    }

    const variants = this.product.variants || [];
    const prices = variants.map(v => v.price || 0);
    
    if (prices.length === 0) {
      return `₱${(this.product.price || 0).toLocaleString()}`;
    }
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    if (minPrice === maxPrice) {
      return `₱${minPrice.toLocaleString()}`;
    }

    return `₱${minPrice.toLocaleString()} - ₱${maxPrice.toLocaleString()}`;
  }

  getStartingPrice(): string {
    if (!this.product) {
      return '₱0';
    }
    
    if (!this.hasVariants()) {
      return `₱${(this.product.price || 0).toLocaleString()}`;
    }

    const variants = this.product.variants || [];
    const prices = variants.map(v => v.price || 0);
    
    if (prices.length === 0) {
      return `₱${(this.product.price || 0).toLocaleString()}`;
    }
    
    const minPrice = Math.min(...prices);
    return `Starting from ₱${minPrice.toLocaleString()}`;
  }

  getTotalStock(): number {
    if (!this.product) {
      return 0;
    }
    
    // If product has variants array with pricing, sum up variant stock
    if (this.product.variants && this.product.variants.length > 0) {
      return this.product.variants.reduce((total, variant) => total + (variant.stockQuantity || 0), 0);
    }
    
    // For products with compatibility info but no variant pricing, use base stock
    return this.product.stockQuantity || 0;
  }

}
