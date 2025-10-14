import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrdersService } from '../../services/orders.service';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../../services/notification.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit {
  orders: any[] = [];
  tab: 'ALL' | 'TO_SHIP' | 'TO_RECEIVE' | 'COMPLETED' | 'CANCELLED' = 'ALL';
  placeholderImg = 'data:image/svg+xml;utf8,%3Csvg xmlns%3D"http%3A//www.w3.org/2000/svg" width%3D"60" height%3D"60"/%3E';
  
  // Modal state
  showProofModal = false;
  proofImageUrl = '';
  
  // Rating modal state
  showRatingModalFlag = false;
  itemsForRating: any[] = [];
  currentRating = 0;
  ratingComment = '';
  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;
  
  // Track rated orders
  ratedOrders = new Set<number>();
  
  // Cancellation modal state
  showCancelModalFlag = false;
  cancellationReasons: any[] = [];
  selectedCancellationReason = '';
  customCancellationReason = '';
  isDropdownOpen = false;
  
  // Shared selected order for both rating and cancellation modals
  selectedOrder: any = null;

  constructor(
    private ordersService: OrdersService, 
    private authService: AuthService,
    private http: HttpClient,
    private notificationService: NotificationService,
    private cartService: CartService,
    private router: Router
  ) {}

  hasVariants(product: any): boolean {
    if (!product) return false;
    const models = this.getCompatibilityModels(product);
    return models.length > 0;
  }

  getCompatibilityModels(product: any): string[] {
    if (!product || !product.compatibility) return [];
    return product.compatibility.split(',').map((model: string) => model.trim());
  }

  ngOnInit(): void {
    const u: any = this.authService.getCurrentUser();
    if (!u) return;
    this.ordersService.getMyOrders(u.id).subscribe({
      next: (list) => {
        this.orders = Array.isArray(list) ? list : [];
        // Load rated orders after orders are loaded with a small delay
        setTimeout(() => {
          this.loadRatedOrders();
        }, 200);
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.orders = [];
      }
    });
  }

  itemsTotal(o: any): number {
    return Number(o?.totalPrice || 0);
  }

  shippingFee(o: any): number {
    const items = this.itemsTotal(o);
    return items < 1000 ? 30 : 0;
  }

  grandTotal(o: any): number {
    return this.itemsTotal(o) + this.shippingFee(o);
  }

  setTab(t: 'ALL' | 'TO_SHIP' | 'TO_RECEIVE' | 'COMPLETED' | 'CANCELLED'): void {
    this.tab = t;
  }

  get filtered(): any[] {
    if (!Array.isArray(this.orders)) return [];
    if (this.tab === 'ALL') return this.orders;
    if (this.tab === 'TO_SHIP') return this.orders.filter(o => o.status === 'PENDING');
    if (this.tab === 'TO_RECEIVE') return this.orders.filter(o => o.status === 'SHIPPED');
    if (this.tab === 'COMPLETED') return this.orders.filter(o => o.status === 'DELIVERED');
    if (this.tab === 'CANCELLED') return this.orders.filter(o => o.status === 'CANCELLED');
    return this.orders;
  }

  formatStatus(status: string): string {
    switch (status) {
      case 'PENDING': return 'PENDING';
      case 'CONFIRMED': return 'CONFIRMED';
      case 'SHIPPED': return 'OUT FOR DELIVERY';
      case 'DELIVERED': return 'DELIVERED';
      case 'CANCELLED': return 'CANCELLED';
      default: return status;
    }
  }

  formatTimestamp(timestamp: string): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  showDeliveryProof(imageUrl: string): void {
    // Ensure the image URL points to the backend server
    if (imageUrl && !imageUrl.startsWith('http')) {
      this.proofImageUrl = 'http://localhost:8080' + imageUrl;
    } else {
      this.proofImageUrl = imageUrl;
    }
    this.showProofModal = true;
  }

  closeProofModal(): void {
    this.showProofModal = false;
    this.proofImageUrl = '';
  }

  showRatingModal(order: any): void {
    this.selectedOrder = order;
    this.currentRating = 0;
    this.ratingComment = '';
    this.selectedImageFile = null;
    this.imagePreviewUrl = null;
    // Build a stable list of items for display (grouped by productId only)
    const items: any[] = Array.isArray(order?.items) ? order.items : [];
    const map = new Map<string, any>();
    const normalize = (v: any) => String(v ?? 'Universal').trim().replace(/\s+/g, ' ');
    
    items.forEach((it: any) => {
      const productId = it.productId || (it.product && it.product.id);
      const rawCompat = it.compatibility || it.size || 'Universal';
      const compat = normalize(rawCompat);
      const key = `${productId}`; // Group by productId only, not by variant
      
      if (!map.has(key)) {
        map.set(key, {
          productId,
          product: it.product,
          name: (it.product && it.product.name) || it.name || 'Product',
          variants: [compat], // Store variants as an array
          totalQuantity: Number(it.quantity) || 1,
          totalPrice: Number(it.price) || 0
        });
      } else {
        const ref = map.get(key);
        ref.variants.push(compat);
        ref.totalQuantity += Number(it.quantity) || 0;
        ref.totalPrice += Number(it.price) || 0;
      }
    });
    
    this.itemsForRating = Array.from(map.values());
    this.showRatingModalFlag = true;
  }

  closeRatingModal(): void {
    this.showRatingModalFlag = false;
    this.selectedOrder = null;
    this.currentRating = 0;
    this.ratingComment = '';
    this.selectedImageFile = null;
    this.imagePreviewUrl = null;
  }

  setRating(rating: number): void {
    this.currentRating = rating;
  }


  getRatingText(rating: number): string {
    const texts = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    return texts[rating] || '';
  }

  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.notificationService.error('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.notificationService.error('Image size must be less than 5MB');
        return;
      }
      
      this.selectedImageFile = file;
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.selectedImageFile = null;
    this.imagePreviewUrl = null;
  }

  submitRating(): void {
    if (!this.selectedOrder || !this.selectedOrder.items || this.selectedOrder.items.length === 0) {
      console.error('No order or items to rate');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      console.error('User not authenticated');
      return;
    }

    // Check if order has been rated
    if (this.currentRating === 0) {
      console.error('Please rate this order');
      return;
    }

    // Submit one rating per product (not per variant) to avoid unique constraint violation
    const ratingPromises: Promise<any>[] = [];
    
    this.itemsForRating.forEach((item: any, itemIndex: number) => {
      const productId = item.productId || (item.product && item.product.id);
      
      if (!productId) {
        console.error(`Product ${itemIndex} has no productId:`, item);
        return;
      }

      // Create one rating per product, including all variants in the comment
      const formData = new FormData();
      formData.append('userId', currentUser.id.toString());
      formData.append('productId', productId.toString());
      formData.append('orderId', this.selectedOrder.id.toString());
      formData.append('rating', this.currentRating.toString());
      
      // Use the user's comment as-is (variant info is already displayed in review header)
      formData.append('comment', this.ratingComment || '');
      
      // Use the first variant for compatibility field (for backend compatibility)
      if (item.variants && item.variants.length > 0) {
        formData.append('compatibility', item.variants[0]);
      }
      
      // Attach image to all products in the order (backend now handles unique filenames)
      if (this.selectedImageFile) {
        formData.append('file', this.selectedImageFile);
      }

      ratingPromises.push(this.http.post('http://localhost:8080/api/ratings', formData).toPromise());
    });

    // Wait for all ratings to be submitted
    Promise.all(ratingPromises.filter((p: Promise<any> | undefined) => p)).then(() => {
      // Mark this order as rated
      this.ratedOrders.add(this.selectedOrder.id);
      this.closeRatingModal();
    }).catch((error) => {
      console.error('Error submitting ratings:', error);
      
      // Handle specific error cases
      if (error.error && error.error.message) {
        if (error.error.message.includes('already rated')) {
          // Mark as rated if backend says it's already rated
          this.ratedOrders.add(this.selectedOrder.id);
        }
      }
    });
  }

  loadRatedOrders(): void {
    // Ensure orders is an array before filtering
    if (!Array.isArray(this.orders)) {
      console.log('Orders is not an array:', this.orders);
      return;
    }
    
    // Load existing ratings for delivered orders
    const deliveredOrders = this.orders.filter(order => order.status === 'DELIVERED');
    const currentUserId = this.authService.getCurrentUser()?.id;
    
    if (!currentUserId || deliveredOrders.length === 0) {
      console.log('No delivered orders or user ID not found');
      return;
    }
    
    console.log('Loading ratings for', deliveredOrders.length, 'delivered orders');
    
    deliveredOrders.forEach(order => {
      this.checkIfRated(order, currentUserId);
    });
  }

  checkIfRated(order: any, userId: number): void {
    if (!order.items || order.items.length === 0) {
      return;
    }
    
    // Check any product in the order to decide if user already has a rating for this order
    const productIds: number[] = (order.items || []).map((it: any) => it.productId || (it.product && it.product.id)).filter((id: any) => !!id);
    if (productIds.length === 0) return;
    // Query the first product; if found a rating for this order and user, mark as rated (best-effort)
    const productId = productIds[0];
    this.http.get<any[]>(`http://localhost:8080/api/ratings/product/${productId}`).subscribe({
      next: (ratings) => {
        // Check if current user has rated this product from this order
        const userRating = ratings.find(rating => {
          return rating.orderId === order.id && rating.userId === userId;
        });
        
        if (userRating) {
          this.ratedOrders.add(order.id);
        }
      },
      error: (error) => {
        console.error('Error checking rating status for order', order.id, ':', error);
      }
    });
  }

  isOrderRated(orderId: number): boolean {
    return this.ratedOrders.has(orderId);
  }

  // Method to clear rating state (useful for testing)
  clearRatingState(): void {
    this.ratedOrders.clear();
    console.log('Rating state cleared');
  }

  // Method to refresh orders and rating state
  refreshOrders(): void {
    const u: any = this.authService.getCurrentUser();
    if (!u) return;
    
    this.ordersService.getMyOrders(u.id).subscribe({
      next: (list) => {
        this.orders = Array.isArray(list) ? list : [];
        // Clear existing rating state and reload
        this.ratedOrders.clear();
        setTimeout(() => {
          this.loadRatedOrders();
        }, 100);
      },
      error: (error) => {
        console.error('Error refreshing orders:', error);
        this.orders = [];
      }
    });
  }

  // Cancellation methods
  showCancelModal(order: any): void {
    this.selectedOrder = order;
    this.showCancelModalFlag = true;
    this.selectedCancellationReason = '';
    this.customCancellationReason = '';
    this.loadCancellationReasons();
  }

  closeCancelModal(): void {
    this.showCancelModalFlag = false;
    this.selectedOrder = null;
    this.selectedCancellationReason = '';
    this.customCancellationReason = '';
    this.isDropdownOpen = false;
  }

  // Dropdown event handlers for arrow rotation
  onDropdownFocus(event: Event): void {
    this.isDropdownOpen = true;
  }

  onDropdownBlur(event: Event): void {
    this.isDropdownOpen = false;
  }

  onDropdownChange(event: Event): void {
    // When a value is selected, close the dropdown and blur the element
    const target = event.target as HTMLSelectElement;
    this.isDropdownOpen = false;
    
    // Use setTimeout to ensure the blur happens after the selection is processed
    setTimeout(() => {
      target.blur();
    }, 0);
  }

  onDropdownMouseDown(event: Event): void {
    const target = event.target as HTMLSelectElement;
    
    // If dropdown is already open (focused), prevent the default behavior and close it
    if (document.activeElement === target) {
      event.preventDefault();
      target.blur();
      this.isDropdownOpen = false;
    }
    // If dropdown is closed, let the browser handle opening it naturally
  }

  loadCancellationReasons(): void {
    this.http.get<any>('http://localhost:8080/api/orders/cancellation-reasons').subscribe({
      next: (response) => {
        if (response.success && response.reasons) {
          this.cancellationReasons = response.reasons;
        }
      },
      error: (error) => {
        console.error('Error loading cancellation reasons:', error);
        // Fallback reasons
        this.cancellationReasons = [
          { value: 'CHANGED_MIND', displayName: 'Changed my mind' },
          { value: 'FOUND_BETTER_PRICE', displayName: 'Found a better price elsewhere' },
          { value: 'NO_LONGER_NEEDED', displayName: 'No longer needed' },
          { value: 'WRONG_ITEM', displayName: 'Ordered wrong item' },
          { value: 'DELIVERY_ISSUES', displayName: 'Delivery issues' },
          { value: 'PAYMENT_PROBLEMS', displayName: 'Payment problems' },
          { value: 'OTHER', displayName: 'Other' }
        ];
      }
    });
  }

  confirmCancellation(): void {
    if (!this.selectedOrder || !this.selectedCancellationReason) {
      return;
    }

    const reason = this.selectedCancellationReason === 'OTHER' 
      ? this.customCancellationReason.trim() 
      : this.cancellationReasons.find(r => r.value === this.selectedCancellationReason)?.displayName || this.selectedCancellationReason;

    const cancelRequest = {
      orderId: this.selectedOrder.id,
      reason: reason
    };

    this.http.post<any>('http://localhost:8080/api/orders/cancel', cancelRequest).subscribe({
      next: (response) => {
        if (response.success) {
          // Update the order status locally
          const orderIndex = this.orders.findIndex(o => o.id === this.selectedOrder.id);
          if (orderIndex !== -1) {
            this.orders[orderIndex].status = 'CANCELLED';
            this.orders[orderIndex].cancellationReason = reason;
            this.orders[orderIndex].cancelledAt = new Date().toISOString();
          }
          
          this.closeCancelModal();
          this.notificationService.success('Order cancelled successfully');
        } else {
          this.notificationService.error('Failed to cancel order: ' + (response.error || 'Unknown error'));
        }
      },
      error: (error) => {
        console.error('Error cancelling order:', error);
        this.notificationService.error('Failed to cancel order. Please try again.');
      }
    });
  }

  buyAgain(order: any): void {
    if (order && order.items && order.items.length > 0) {
      // Get the first item from the cancelled order
      const item = order.items[0];
      if (item && item.product) {
        // Create a complete product object with price from the order item
        const productWithPrice = {
          ...item.product,
          price: item.price // Use the price from the order item, not the product
        };
        
        // Use beginCheckoutForProduct to directly set up checkout session
        // This bypasses the shopping cart entirely
        this.cartService.beginCheckoutForProduct(
          productWithPrice, 
          item.quantity, 
          item.compatibility || 'Universal'
        );
        
        // Navigate directly to checkout page
        this.router.navigate(['/checkout']);
      }
    }
  }

}
