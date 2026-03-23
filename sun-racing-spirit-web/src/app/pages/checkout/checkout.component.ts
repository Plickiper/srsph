import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { CartItem, User } from '../../models/product.model';
import { FormsModule } from '@angular/forms';
import { OrdersService } from '../../services/orders.service';
import { LoadingService } from '../../core/loading.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit {
  user: User | null = null;
  items: CartItem[] = [];
  itemsTotal = 0;
  shippingFee = 0;
  grandTotal = 0;
  placeholderImg = '';
  // Delivery info (prefilled from profile if available)
  delivery = {
    fullName: '',
    phoneNumber: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: ''
  };
  // Payment method (no default selection)
  paymentMethod: 'COD' | 'GCASH' | null = null;
  isPlacingOrder = false;

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
    private ordersService: OrdersService,
    private loadingService: LoadingService,
    private notificationService: NotificationService
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
    this.placeholderImg = 'data:image/svg+xml;utf8,%3Csvg xmlns%3D"http%3A//www.w3.org/2000/svg" width%3D"80" height%3D"80"/%3E';
    // Coerce to model type by mapping relevant fields
    const u: any = this.authService.getCurrentUser();
    this.user = u ? {
      id: u.id,
      username: u.username,
      email: u.email,
      role: (u.role as any),
      firstName: u.firstName,
      lastName: u.lastName,
      phoneNumber: u.phoneNumber,
      address: u.address,
      city: u.city,
      state: u.state,
      postalCode: u.postalCode,
      country: u.country,
      isActive: !!u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    } : null;

    // Check if user is authenticated
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    // Prefill delivery info from user profile when available
    if (this.user) {
      this.delivery.fullName = [this.user.firstName, this.user.lastName].filter(Boolean).join(' ').trim();
      this.delivery.phoneNumber = (u && u.phoneNumber) || '';
      this.delivery.address = this.user.address || '';
      this.delivery.city = this.user.city || '';
      this.delivery.state = this.user.state || '';
      this.delivery.postalCode = this.user.postalCode || '';
      this.delivery.country = this.user.country || '';
    }

    // Load items from checkout session (buy-now or selected cart items)
    this.items = this.cartService.getCheckoutItems();
    if (!this.items || this.items.length === 0) {
      // No selection; go back to cart for clarity
      this.router.navigate(['/cart']);
      return;
    }

    // Compute totals locally based on checkout items
    this.itemsTotal = this.items.reduce((t, i) => t + (i.price * i.quantity), 0);
    this.shippingFee = this.itemsTotal < 1000 ? 30 : 0;
    this.grandTotal = this.itemsTotal + this.shippingFee;
  }

  ngOnDestroy(): void {
    // Leaving checkout should clear ephemeral state
    this.cartService.clearCheckoutSession();
  }

  // Create order then navigate to My Orders
  placeOrder(): void {
    if (!this.user || !this.paymentMethod || this.isPlacingOrder) return;

    // Validate profile completion
    if (!this.isProfileComplete()) {
      this.notificationService.error('Please update your profile to checkout the product.');
      this.router.navigate(['/profile']);
      return;
    }

    // Validate delivery information
    if (!this.isDeliveryInfoComplete()) {
      this.notificationService.error('Please update your profile to checkout the product.');
      return;
    }

    // Set loading state
    this.isPlacingOrder = true;
    this.loadingService.show();

    // Map items with correct field names for backend
    const items = this.items.map(i => ({
      productId: i.productId,
      quantity: i.quantity,
      price: i.price,
      compatibility: i.size || i.compatibility || 'Universal' // Map size to compatibility
    }));

    // Map delivery info to backend expected fields
    const payload = {
      userId: this.user.id,
      items: items,
      paymentMethod: this.paymentMethod,
      shippingAddress: this.delivery.address || '',
      city: this.delivery.city || '',
      state: this.delivery.state || '',
      postalCode: this.delivery.postalCode || '',
      country: this.delivery.country || 'Philippines',
      phoneNumber: this.delivery.phoneNumber || this.user.phoneNumber || ''
    };

    console.log('Creating order with payload:', payload); // Debug log

    this.ordersService.createOrder(payload).subscribe({
      next: (response) => {
        console.log('Order created successfully:', response); // Debug log

        // Check if the response indicates success
        if (response && response.success) {
          try {
            // Clear the entire cart after successful checkout
            this.cartService.clearEntireCart();
            this.cartService.clearCheckoutSession();
          } catch (error) {
            console.error('Error clearing cart after checkout:', error);
          }
          this.router.navigate(['/orders']);
        } else {
          console.error('Order creation failed:', response);
          // Show error message to user
          alert('Failed to create order. Please try again.');
        }
      },
      error: (error) => {
        console.error('Error creating order:', error);
        // Show error message to user
        alert('Error creating order. Please try again.');
      },
      complete: () => {
        // Always hide loading state when request completes
        this.isPlacingOrder = false;
        this.loadingService.hide();
      }
    });
  }

  get paymentMethodLabel(): string {
    if (this.paymentMethod === 'COD') return 'Cash on Delivery';
    if (this.paymentMethod === 'GCASH') return 'GCash';
    return '';
  }

  // Profile validation methods
  isProfileComplete(): boolean {
    if (!this.user) return false;

    return !!(
      this.user.firstName &&
      this.user.lastName &&
      this.user.email &&
      this.user.phoneNumber &&
      this.user.address &&
      this.user.city &&
      this.user.state &&
      this.user.postalCode &&
      this.user.country
    );
  }

  isDeliveryInfoComplete(): boolean {
    return !!(
      this.delivery.fullName &&
      this.delivery.phoneNumber &&
      this.delivery.address &&
      this.delivery.city &&
      this.delivery.state &&
      this.delivery.postalCode &&
      this.delivery.country
    );
  }

  getMissingProfileFields(): string[] {
    const missing: string[] = [];
    if (!this.user) return ['User not found'];

    if (!this.user.firstName) missing.push('First Name');
    if (!this.user.lastName) missing.push('Last Name');
    if (!this.user.email) missing.push('Email');
    if (!this.user.phoneNumber) missing.push('Phone Number');
    if (!this.user.address) missing.push('Address');
    if (!this.user.city) missing.push('City');
    if (!this.user.state) missing.push('State');
    if (!this.user.postalCode) missing.push('Postal Code');
    if (!this.user.country) missing.push('Country');

    return missing;
  }

  getMissingDeliveryFields(): string[] {
    const missing: string[] = [];

    if (!this.delivery.fullName) missing.push('Full Name');
    if (!this.delivery.phoneNumber) missing.push('Phone Number');
    if (!this.delivery.address) missing.push('Address');
    if (!this.delivery.city) missing.push('City');
    if (!this.delivery.state) missing.push('State');
    if (!this.delivery.postalCode) missing.push('Postal Code');
    if (!this.delivery.country) missing.push('Country');

    return missing;
  }

  canPlaceOrder(): boolean {
    return this.isProfileComplete() && this.isDeliveryInfoComplete() && !!this.paymentMethod && !this.isPlacingOrder;
  }

  onPlaceOrder(): void {
    if (!this.paymentMethod) {
      return;
    }
    this.placeOrder();
  }

  clearCheckout(): void {
    this.cartService.clearCheckoutSession();
  }
}
