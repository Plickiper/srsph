import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { CartService } from '../../services/cart.service';
import { ProductUpdateWatcherService } from '../../services/product-update-watcher.service';
import { AuthService } from '../../services/auth.service';
import { CartItem, Product } from '../../models/product.model';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  cartTotal = 0;
  selectedItemsTotal = 0;
  selectedItemsQuantity = 0;
  shippingFee = 0;
  totalWithShipping = 0;
  showVariantDropdown: { [key: string]: boolean } = {};
  // Inline SVG placeholder image (avoids 404 and extra asset)
  defaultProductImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" fill="%23f0f0f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-family="Arial" font-size="14">No Image</text></svg>';

  constructor(
    private cartService: CartService,
    private productUpdateWatcher: ProductUpdateWatcherService,
    private authService: AuthService,
    private router: Router,
    private title: Title
  ) {}

  ngOnInit(): void {
    // Set page title
    this.title.setTitle('Shopping Cart - Sun Racing Spirit Philippines');
    
    // Start watching for product updates
    this.productUpdateWatcher.startWatching();
    
    // Clean up any stale cart items first
    this.cartService.cleanupStaleItems();
    
    // Only load from server/storage if we don't already have items in memory.
    // This preserves the user's recent action ordering (e.g., newly added item on top)
    const existing = this.cartService.getCurrentCart();
    if (!existing || !Array.isArray(existing.items) || existing.items.length === 0) {
      this.cartService.loadAppropriateCart();
    }
    
    // Refresh product data in cart to get latest prices
    this.cartService.refreshCartProductData();
    
    this.cartService.cartItems$.subscribe(items => {
      this.cartItems = items;
      this.cartTotal = this.cartService.getCartTotal();
      this.updateSelectedTotals();
      
      // Check if any items are missing product data and refresh if needed
      const itemsMissingProductData = items.some(item => !item.product);
      if (itemsMissingProductData) {
        this.cartService.refreshCartProductData();
      }
    });
  }

  ngOnDestroy(): void {
    // Stop watching for product updates when leaving the cart page
    this.productUpdateWatcher.stopWatching();
  }


  updateQuantity(item: CartItem, newQuantity: number): void {
    // Prevent quantity from going below 1
    if (newQuantity < 1) {
      return;
    }
    const productId = item.product?.id ?? item.productId;
    if (productId == null) return;
    this.cartService.updateQuantity(productId, item.size || 'Universal', newQuantity);
  }

  removeItem(item: CartItem): void {
    const productId = item.product?.id ?? item.productId;
    const variant = item.size || 'Universal';
    
    // Optimistic UI: remove item immediately from local state
    this.cartItems = this.cartItems.filter(ci => !((ci.productId === productId) && ((ci.size || 'Universal') === variant)));
    this.updateSelectedTotals();
    
    // Try server-side removal if authenticated and item has valid ID
    if (this.authService.isAuthenticated() && item.id != null) {
      this.cartService.removeCartItem(item.id).subscribe({
        next: (updatedCart) => {
          // Preserve product snapshots to avoid flicker while images reload
          this.cartService.applyServerCartPreserveProduct(updatedCart);
        },
        error: (error) => {
          console.error('Error removing cart item (auth):', error);
          
          // If 404 error, the item doesn't exist on server - this is fine, just sync cart
          if (error.status === 404) {
            console.log('Item not found on server, syncing cart...');
            const user = this.authService.getCurrentUser();
            if (user) {
              this.cartService.loadCartForUser(user.id);
            }
          } else {
            // For other errors, revert the optimistic update
            this.cartService.loadAppropriateCart();
          }
        }
      });
    } else {
      // Guest path or no valid ID: manage removal locally
      if (productId != null) {
        this.cartService.removeFromCart(productId, variant);
      }
    }
  }

  toggleItemSelection(item: CartItem): void {
    const productId = item.product?.id ?? item.productId;
    if (productId == null) return;
    this.cartService.toggleItemSelection(productId, item.size || 'Universal');
    this.updateSelectedTotals();
  }

  selectAllItems(): void {
    this.cartService.selectAllItems();
    this.updateSelectedTotals();
  }

  deselectAllItems(): void {
    this.cartService.deselectAllItems();
    this.updateSelectedTotals();
  }

  private updateSelectedTotals(): void {
    this.selectedItemsTotal = this.cartService.getSelectedItemsTotal();
    this.selectedItemsQuantity = this.cartService.getSelectedItemsQuantity();
    this.shippingFee = this.cartService.getShippingFee();
    this.totalWithShipping = this.cartService.getTotalWithShipping();
  }

  getCompatibilityModels(product: Product): string[] {
    // Prefer structured variants if present
    let variants: any = (product as any).variants;
    if (typeof variants === 'string') {
      try {
        variants = JSON.parse(variants);
      } catch {
        variants = [];
      }
    }
    if (Array.isArray(variants) && variants.length > 0) {
      return variants.map((v: any) => v.model).filter((m: any) => !!m);
    }

    // Fallback to compatibility CSV
    if (!product.compatibility) return [];
    return product.compatibility.split(',').map(model => this.formatVariantLabel(model));
  }

  hasVariants(product: Product): boolean {
    const models = this.getCompatibilityModels(product);
    return models.length > 0;
  }

  isVariantOutOfStock(product: Product, variant: string): boolean {
    // Handle variants possibly coming as JSON string or array
    let variants: any = (product as any).variants;
    if (typeof variants === 'string') {
      try {
        variants = JSON.parse(variants);
      } catch {
        variants = [];
      }
    }
    if (Array.isArray(variants) && variants.length > 0) {
      const variantData = variants.find((v: any) => v.model === variant);
      return variantData ? (variantData.stockQuantity || 0) <= 0 : true;
    }
    // No structured variants; fall back to base stock
    return (product.stockQuantity || 0) <= 0;
  }

  // Display helper: show model without brand prefixes like "Yamaha" or "Honda"
  formatVariantLabel(raw: string | null | undefined): string {
    if (!raw) return '';
    const value = String(raw).trim();
    const prefixes = ['Yamaha ', 'Honda '];
    for (const prefix of prefixes) {
      if (value.startsWith(prefix)) {
        return value.substring(prefix.length);
      }
    }
    return value;
  }

  getAvailableVariants(product: Product): string[] {
    const allVariants = this.getCompatibilityModels(product);
    return allVariants.filter(variant => !this.isVariantOutOfStock(product, variant));
  }

  toggleVariantDropdown(item: CartItem): void {
    const key = `${item.productId}-${item.size}`;
    
    // Close all other dropdowns first
    Object.keys(this.showVariantDropdown).forEach(dropdownKey => {
      if (dropdownKey !== key) {
        this.showVariantDropdown[dropdownKey] = false;
      }
    });
    
    // Toggle current dropdown
    this.showVariantDropdown[key] = !this.showVariantDropdown[key];
  }

  onVariantButtonClick(item: CartItem, event: Event): void {
    const product = item.product as Product;
    if (!product) return;
    const models = this.getCompatibilityModels(product);
    if (models.length > 1) {
      this.toggleVariantDropdown(item);
      event.stopPropagation();
    }
  }

  closeAllDropdowns(): void {
    Object.keys(this.showVariantDropdown).forEach(key => {
      this.showVariantDropdown[key] = false;
    });
  }

  updateVariant(item: CartItem, newVariant: string): void {
    const productId = item.product?.id ?? item.productId;
    if (productId == null) return;
    this.cartService.updateItemVariant(productId, item.size || item.compatibility || 'Universal', newVariant);
    this.toggleVariantDropdown(item);
  }

  getSelectedItems(): CartItem[] {
    return this.cartService.getSelectedItems();
  }

  // Helper methods for template
  areAllItemsSelected(): boolean {
    return this.cartItems.length > 0 && this.cartItems.every(item => item.selected || false);
  }

  areSomeItemsSelected(): boolean {
    return this.cartItems.some(item => item.selected || false);
  }

  isIndeterminate(): boolean {
    return this.areSomeItemsSelected() && !this.areAllItemsSelected();
  }

  onSelectAllChange(): void {
    if (this.areAllItemsSelected()) {
      this.deselectAllItems();
    } else {
      this.selectAllItems();
    }
  }

  trackByCartItem(index: number, item: CartItem | undefined): string | number {
    if (!item) return index;
    const productId = item.product?.id ?? item.productId ?? 'unknown';
    const sizeKey = item.size || 'Universal';
    return `${productId}-${sizeKey}`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Close all dropdowns when clicking outside
    this.closeAllDropdowns();
  }

  // Handle checkout button click
  proceedToCheckout(): void {
    if (this.authService.isAuthenticated()) {
      // Capture selected items for checkout session and proceed
      this.cartService.beginCheckoutFromCart();
      this.router.navigate(['/checkout']);
    } else {
      // User is not logged in, redirect to login with return URL
      // Preserve checkout session for guest (lean snapshot stored already in beginCheckout...)
      this.cartService.beginCheckoutFromCart();
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: '/checkout' } 
      });
    }
  }
}
