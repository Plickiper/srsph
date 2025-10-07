import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { Product, ProductVariant } from '../../models/product.model';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss']
})
export class ProductDetailComponent implements OnInit {
  product: Product | null = null;
  showImageModal = false;
  quantity = 1;
  selectedImage: string | null = null;
  selectedVariant: string | null = null;
  selectedVariantData: ProductVariant | null = null;
  
  // Rating data
  productRating = 0;
  reviewCount = 0;
  ratings: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private cartService: CartService,
    private title: Title,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Scroll to top when component loads
    window.scrollTo(0, 0);
    
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.productService.getProductById(+id).subscribe(product => {
        this.product = product;
        
        // Set page title with product name
        if (product) {
          this.title.setTitle(`${product.name} - Sun Racing Spirit Philippines`);
        }
        
        // Parse variants if they come as JSON string
        if (product && product.variants && typeof product.variants === 'string') {
          try {
            product.variants = JSON.parse(product.variants);
          } catch (error) {
            console.error('Error parsing variants JSON:', error);
            product.variants = [];
          }
        }
        
        // Set the first image as selected by default
        if (product && product.imageUrl) {
          this.selectedImage = product.imageUrl;
        }
        // Set variant selection logic
        this.initializeVariantSelection();
        
        // Load product ratings
        this.loadProductRatings(+id);
      });
    }
  }

  addToCart(): void {
    if (this.product) {
      if (this.hasVariants() && this.isVariantSelected()) {
        // Use selected variant
        const variant = this.selectedVariant!;
        this.cartService.addToCart(this.product, this.quantity, variant);
      } else if (!this.hasVariants()) {
        // Product without variants - add directly
        const defaultVariant = 'Universal';
        this.cartService.addToCart(this.product, this.quantity, defaultVariant);
      }
    }
  }

  increaseQuantity(): void {
    const currentStock = this.getCurrentStock();
    if (this.quantity < currentStock) {
      this.quantity++;
    }
  }

  decreaseQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  onQuantityChange(): void {
    const currentStock = this.getCurrentStock();
    if (this.quantity > currentStock) {
      this.quantity = currentStock;
    } else if (this.quantity < 1) {
      this.quantity = 1;
    }
  }

  hasVariants(): boolean {
    return !!(this.product?.color || this.product?.size || this.product?.compatibility);
  }

  getCompatibilityModels(): string[] {
    if (!this.product?.compatibility) return [];
    return this.product.compatibility.split(',').map(model => {
      const trimmedModel = model.trim();
      // Remove brand prefix if it exists for display
      if (trimmedModel.startsWith('Yamaha ')) {
        return trimmedModel.substring(7); // Remove "Yamaha "
      } else if (trimmedModel.startsWith('Honda ')) {
        return trimmedModel.substring(6); // Remove "Honda "
      }
      return trimmedModel; // Return as-is if no brand prefix
    });
  }

  hasVariantPricing(): boolean {
    return !!(this.product?.variants && this.product.variants.length > 0);
  }

  getVariantForModel(model: string): ProductVariant | null {
    if (!this.product?.variants) return null;
    return this.product.variants.find(v => v.model === model) || null;
  }

  getCurrentPrice(): number {
    if (this.hasVariantPricing() && this.selectedVariantData) {
      return this.selectedVariantData.price;
    }
    return this.product?.price || 0;
  }

  getCurrentStock(): number {
    if (this.hasVariantPricing() && this.selectedVariantData) {
      return this.selectedVariantData.stockQuantity;
    }
    if (this.hasVariantPricing() && !this.selectedVariantData) {
      // Show total stock when no variant is selected
      return this.product?.variants?.reduce((total, variant) => total + variant.stockQuantity, 0) || 0;
    }
    // For products with compatibility info but no variant pricing, use base stock
    return this.product?.stockQuantity || 0;
  }

  getPriceRange(): string {
    if (!this.hasVariantPricing() || !this.product?.variants) {
      return `₱${(this.product?.price || 0).toLocaleString()}`;
    }
    
    const prices = this.product.variants.map(v => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    if (minPrice === maxPrice) {
      return `₱${minPrice.toLocaleString()}`;
    }
    
    return `₱${minPrice.toLocaleString()} - ₱${maxPrice.toLocaleString()}`;
  }

  initializeVariantSelection(): void {
    const models = this.getCompatibilityModels();
    if (models.length === 1) {
      // Single model - pre-select it and lock it only if it's in stock
      if (!this.isVariantOutOfStock(models[0])) {
        this.selectedVariant = models[0];
        this.selectedVariantData = this.getVariantForModel(models[0]);
        this.quantity = 1; // Reset quantity when variant context changes
        this.clampQuantityToStock();
      } else {
        this.selectedVariant = null;
        this.selectedVariantData = null;
        this.quantity = 1;
        this.clampQuantityToStock();
      }
    } else {
      // Multiple models - no pre-selection, user must choose
      this.selectedVariant = null;
      this.selectedVariantData = null;
      this.quantity = 1;
      this.clampQuantityToStock();
    }
  }

  selectVariant(variant: string): void {
    const models = this.getCompatibilityModels();
    
    // If only one model, don't allow deselection (locked)
    if (models.length === 1) {
      return;
    }
    
    // Don't allow selection if variant is out of stock
    if (this.isVariantOutOfStock(variant)) {
      return;
    }
    
    // For multiple models, toggle selection
    if (this.selectedVariant === variant) {
      this.selectedVariant = null;
      this.selectedVariantData = null;
      this.quantity = 1;
      this.clampQuantityToStock();
    } else {
      this.selectedVariant = variant;
      this.selectedVariantData = this.getVariantForModel(variant);
      this.quantity = 1;
      this.clampQuantityToStock();
    }
  }

  isVariantLocked(): boolean {
    return this.getCompatibilityModels().length === 1;
  }

  isVariantSelected(): boolean {
    return this.selectedVariant !== null;
  }

  isVariantOutOfStock(variant: string): boolean {
    if (!this.product) {
      return false;
    }
    
    // If product has variant pricing, check variant stock
    if (this.product.variants && this.product.variants.length > 0) {
      const variantData = this.getVariantForModel(variant);
      return variantData ? variantData.stockQuantity <= 0 : false;
    }
    
    // For products with compatibility info but no variant pricing, check base stock
    return (this.product.stockQuantity || 0) <= 0;
  }

  openImageModal(): void {
    this.showImageModal = true;
  }

  closeImageModal(): void {
    this.showImageModal = false;
  }

  getPlaceholderImage(): string {
    return 'https://via.placeholder.com/600x600/1a1a1a/ffffff?text=No+Image';
  }

  onImageError(event: any): void {
    event.target.src = this.getPlaceholderImage();
  }

  getStarArray(rating: number): number[] {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(1); // Full star
      } else if (i === fullStars && hasHalfStar) {
        stars.push(0.5); // Half star
      } else {
        stars.push(0); // Empty star
      }
    }
    
    return stars;
  }

  getAllImages(): string[] {
    if (!this.product) return [];
    const images = [this.product.imageUrl];
    if (this.product.images && this.product.images.length > 0) {
      images.push(...this.product.images);
    }
    return images.filter(img => img && img.trim() !== '');
  }

  selectImage(image: string): void {
    this.selectedImage = image;
  }

  formatSoldCount(count: number): string {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getInitials(userName: string): string {
    if (!userName) return 'U';
    const names = userName.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  }

  onAvatarError(event: any, rating: any): void {
    console.log('Avatar failed to load for user:', rating.userName);
    // Hide the image and show initials instead
    rating.avatarUrl = null;
    event.target.style.display = 'none';
  }

  getReviewImageUrl(imageUrl: string): string {
    if (!imageUrl) return '';
    // Ensure the image URL points to the backend server
    if (imageUrl && !imageUrl.startsWith('http')) {
      return 'http://localhost:8080' + imageUrl;
    }
    return imageUrl;
  }

  onReviewImageError(event: any, rating: any): void {
    console.log('Review image failed to load for rating:', rating.id);
    // Hide the image
    rating.reviewImageUrl = null;
    event.target.style.display = 'none';
  }

  toggleReviewImageExpanded(rating: any): void {
    rating.isImageExpanded = !rating.isImageExpanded;
  }

  buyNow(): void {
    if (this.product && this.isVariantSelected()) {
      // Use selected variant
      const variant = this.selectedVariant!;
      // Start a dedicated checkout session with exact quantity
      this.cartService.beginCheckoutForProduct(this.product, this.quantity, variant);
      // Navigate to checkout (AuthGuard will redirect to login if needed)
      setTimeout(() => {
        window.scrollTo(0, 0);
        (location as any).href = '/checkout';
      }, 10);
    }
  }

  // Ensure quantity never exceeds current variant/base stock when switching variants
  private clampQuantityToStock(): void {
    const stock = this.getCurrentStock();
    if (stock <= 0) {
      this.quantity = 1;
      return;
    }
    if (this.quantity > stock) {
      this.quantity = stock;
    } else if (this.quantity < 1) {
      this.quantity = 1;
    }
  }

  // Load product ratings from backend
  loadProductRatings(productId: number): void {
    // Load rating statistics
    this.http.get<any>(`http://localhost:8080/api/ratings/product/${productId}/stats`).subscribe({
      next: (stats) => {
        this.productRating = stats.averageRating || 0;
        this.reviewCount = stats.totalRatings || 0;
        console.log('Product rating stats:', stats);
      },
      error: (error) => {
        console.error('Error loading rating stats:', error);
        this.productRating = 0;
        this.reviewCount = 0;
      }
    });

    // Load individual ratings
    this.http.get<any[]>(`http://localhost:8080/api/ratings/product/${productId}`).subscribe({
      next: (ratings) => {
        this.ratings = ratings || [];
        console.log('Product ratings:', ratings);
      },
      error: (error) => {
        console.error('Error loading ratings:', error);
        this.ratings = [];
      }
    });
  }
}

