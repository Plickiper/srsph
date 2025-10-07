import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { CartItem, User } from '../../models/product.model';
import { FormsModule } from '@angular/forms';
import { OrdersService } from '../../services/orders.service';

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

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
    private ordersService: OrdersService
  ) {}

  ngOnInit(): void {
    // Safe inline SVG placeholder (encoded) to avoid template quoting issues
    this.placeholderImg = 'data:image/svg+xml;utf8,%3Csvg xmlns%3D"http%3A//www.w3.org/2000/svg" width%3D"80" height%3D"80"/%3E';
    // Load user
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
    if (!this.user || !this.paymentMethod) return;
    const payload = {
      userId: this.user.id,
      items: this.items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price, size: i.size })),
      paymentMethod: this.paymentMethod,
      ...this.delivery
    };
    this.ordersService.createOrder(payload).subscribe({
      next: () => {
        try {
          // Clear the entire cart after successful order
          this.cartService.clearEntireCart();
          this.cartService.clearCheckoutSession();
        } catch (error) {
          console.error('Error clearing cart after order:', error);
        }
        this.router.navigate(['/orders']);
      },
      error: (error) => {
        console.error('Error creating order:', error);
        // stay on page; a real app would show a toast
      }
    });
  }

  get paymentMethodLabel(): string {
    if (this.paymentMethod === 'COD') return 'Cash on Delivery';
    if (this.paymentMethod === 'GCASH') return 'GCash';
    return '';
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
