import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { Cart, CartItem, Product } from '../models/product.model';
import { NotificationService } from './notification.service';
import { ProductService } from './product.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl = 'http://localhost:8080/api/cart';
  private cartSubject = new BehaviorSubject<Cart | null>(null);
  public cart$ = this.cartSubject.asObservable();
  private checkoutKey = 'sun-racing-checkout';
  private checkoutSubject = new BehaviorSubject<CartItem[] | null>(null);
  public checkout$ = this.checkoutSubject.asObservable();

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService,
    private authService: AuthService,
    private productService: ProductService
  ) {
    // Load cart from localStorage on service initialization
    this.loadCartFromStorage();
    this.loadCheckoutFromStorage();

    // Clear checkout session when route changes away from checkout
    try {
      window.addEventListener('hashchange', () => this.handleNavigation());
      window.addEventListener('popstate', () => this.handleNavigation());
    } catch {}
  }
  // Clear in-memory cart to avoid showing guest data during login transition
  resetCartMemory(): void {
    this.cartSubject.next(null);
  }

  // Clean up any stale or invalid cart items
  cleanupStaleItems(): void {
    const cart = this.getCurrentCart();
    if (!cart || !Array.isArray(cart.items)) return;

    // Filter out items with invalid or stale IDs
    const validItems = cart.items.filter(item => {
      // Keep items without IDs (local items) or with valid positive IDs
      return !item.id || (typeof item.id === 'number' && item.id > 0);
    });

    if (validItems.length !== cart.items.length) {
      console.log(`Cleaned up ${cart.items.length - validItems.length} stale cart items`);
      const cleanedCart = { ...cart, items: validItems };
      this.setCurrentCart(cleanedCart);
    }
  }

  // Merge locally stored guest cart (localStorage) into the authenticated user's server cart
  // This is used right after a successful login. It safely handles empty carts and API errors.
  async mergeLocalGuestCartToUser(userId: number): Promise<void> {
    try {
      const data = localStorage.getItem('sun-racing-cart');
      if (!data) {
        return; // nothing to merge
      }
      const parsed: any = JSON.parse(data);
      const items: CartItem[] = Array.isArray(parsed?.items) ? parsed.items : [];
      if (items.length === 0) {
        return;
      }

      // Add each item to the user's cart. Use size as variant; fall back to compatibility/Universal.
      // Do requests sequentially to preserve order and avoid server race conditions.
      for (const item of items) {
        const payload: Partial<CartItem> = {
          productId: item.productId,
          quantity: Number(item.quantity) || 1,
          price: Number(item.price) || 0,
          compatibility: (item.size || (item as any).compatibility || 'Universal'),
          size: (item.size || (item as any).compatibility || 'Universal')
        };
        await new Promise<void>((resolve) => {
          this.addItemToUserCart(userId, payload).subscribe({
            next: (updatedCart) => {
              // Apply server cart but keep product snapshots when available
              this.applyServerCartPreserveProduct(updatedCart);
              resolve();
            },
            error: () => {
              // Ignore individual failures so other items still merge
              resolve();
            }
          });
        });
      }

      // After merge, clear the local guest cart snapshot
      this.setCurrentCart(null);
      this.clearCartFromStorage();
      try { localStorage.removeItem('guest_session_id'); } catch {}
    } catch {
      // If anything goes wrong, don't block login flow
    }
  }

  // Get cart by user ID
  getCartByUserId(userId: number): Observable<Cart> {
    return this.http.get<Cart>(`${this.apiUrl}/user/${userId}`);
  }

  // Create cart for user
  createCart(userId: number): Observable<Cart> {
    return this.http.post<Cart>(`${this.apiUrl}/user/${userId}`, {});
  }

  // Add item to cart
  addItemToCart(cartItem: CartItem): Observable<Cart> {
    return this.http.post<Cart>(`${this.apiUrl}/add-item`, cartItem);
  }

  // Add item to a specific user's cart (authenticated path)
  addItemToUserCart(userId: number, cartItem: Partial<CartItem>): Observable<Cart> {
    return this.http.post<Cart>(`${this.apiUrl}/user/${userId}/add-item`, cartItem);
  }

  // Update cart item
  updateCartItem(itemId: number, cartItem: CartItem): Observable<Cart> {
    return this.http.put<Cart>(`${this.apiUrl}/item/${itemId}`, cartItem);
  }

  // Remove item from cart
  removeCartItem(itemId: number): Observable<Cart> {
    return this.http.delete<Cart>(`${this.apiUrl}/item/${itemId}`);
  }

  // Sync cart with server to ensure data consistency
  syncCartWithServer(): void {
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getCurrentUser();
      if (user) {
        this.loadCartForUser(user.id);
      }
    } else {
      const sessionId = this.authService.getGuestSessionId();
      if (sessionId) {
        this.loadGuestCart(sessionId);
      }
    }
  }

  // Clear entire cart
  clearCart(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/user/${userId}`);
  }

  // Set current cart
  setCurrentCart(cart: Cart | null): void {
    if (cart) {
      // Normalize items to an empty array if null/undefined
      const rawItems = Array.isArray((cart as any).items) ? (cart as any).items as CartItem[] : [];
      // Merge duplicate items by productId + normalized size while preserving order
      const mergedItems: CartItem[] = [];
      const seenKeys = new Set<string>();
      
      for (const item of rawItems) {
        // Map backend compatibility field to frontend size field
        if ((item as any).compatibility && !item.size) {
          item.size = (item as any).compatibility;
        }
        if (item.size && !(item as any).compatibility) {
          (item as any).compatibility = item.size;
        }
        
        // Normalize size: prefer explicit size, else backend 'compatibility', else 'Universal'
        const localSize = (item.size || (item as any).compatibility || 'Universal');
        item.size = localSize;
        const normalizedSize = localSize;
        const key = `${item.productId}-${normalizedSize}`;
        
        if (seenKeys.has(key)) {
          // Find existing item and merge quantities
          const existingIndex = mergedItems.findIndex(existing => 
            existing.productId === item.productId && 
            (existing.size || existing.compatibility || 'Universal') === normalizedSize
          );
          if (existingIndex !== -1) {
            const existing = mergedItems[existingIndex];
            existing.quantity += item.quantity || 0;
            existing.updatedAt = new Date().toISOString();
            // Prefer latest product snapshot and price if provided
            if (item.product) existing.product = item.product;
            if (typeof item.price === 'number') existing.price = item.price;
          }
        } else {
          // Add new item and mark key as seen
          mergedItems.push({ ...item, size: normalizedSize });
          seenKeys.add(key);
        }
      }
      (cart as any).items = mergedItems;
      // Recalculate totals after merging
      this.recalculateCartTotals(cart as any);
    }
    this.cartSubject.next(cart);
    // Save to localStorage
    this.saveCartToStorage(cart);
    // If any item lacks product data, hydrate from backend
    if (cart && Array.isArray((cart as any).items)) {
      const needsHydration = (cart as any).items.some((i: any) => !i.product);
      if (needsHydration) {
        this.refreshCartProductData();
      }
    }
  }

  // Get current cart
  getCurrentCart(): Cart | null {
    return this.cartSubject.value;
  }

  // Add product to cart (convenience method)
  addProductToCart(userId: number, product: Product, quantity: number, compatibility: string): Observable<Cart> {
    const cartItem: CartItem = {
      id: 0,
      cartId: userId, // This will be the user's cart ID
      productId: product.id,
      product: product, // Add the product object
      quantity: quantity,
      price: product.price,
      compatibility: compatibility,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return this.addItemToCart(cartItem);
  }

  // Get cart item count
  getCartItemCount(): number {
    const cart = this.getCurrentCart();
    return cart ? cart.totalQuantity : 0;
  }

  // Get cart total price
  getCartTotalPrice(): number {
    const cart = this.getCurrentCart();
    return cart ? cart.totalPrice : 0;
  }

  // Check if cart is empty
  isCartEmpty(): boolean {
    const cart = this.getCurrentCart();
    return !cart || cart.totalQuantity === 0;
  }

  // Load cart for user
  loadCartForUser(userId: number): void {
    this.getCartByUserId(userId).subscribe({
      next: (cart) => {
        // Discard any lingering guest local snapshot to prevent rollback
        try { localStorage.removeItem('sun-racing-cart'); } catch {}
        this.setCurrentCart(cart);
      },
      error: (error) => {
        console.error('Error loading cart:', error);
        // If cart doesn't exist, create one
        this.createCart(userId).subscribe({
          next: (newCart) => {
            this.setCurrentCart(newCart);
          },
          error: (createError) => {
            console.error('Error creating cart:', createError);
          }
        });
      }
    });
  }

  // Refresh product data in cart items
  refreshCartProductData(): void {
    const cart = this.getCurrentCart();
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) return;

    // Get all unique product IDs from cart that are missing product data
    const productIds = [...new Set(cart.items
      .filter(item => !item.product)
      .map(item => item.productId))];
    
    // Fetch updated product data for all products in cart that are missing product data
    productIds.forEach(productId => {
      this.http.get<{success: boolean, product: Product}>(`http://localhost:8080/api/products/${productId}`)
        .subscribe({
          next: (response) => {
            if (response.success && response.product) {
              this.updateCartItemProductData(cart, response.product);
            }
          },
          error: (error) => {
            console.error(`Error fetching updated product data for product ${productId}:`, error);
          }
        });
    });
  }

  // Update product data for all cart items of a specific product
  private updateCartItemProductData(cart: Cart, updatedProduct: Product): void {
    let hasChanges = false;
    
    cart.items.forEach(item => {
      if (item.productId === updatedProduct.id) {
        // Update the product object and price
        const oldPrice = item.price;
        item.product = updatedProduct;
        item.price = updatedProduct.price;
        item.updatedAt = new Date().toISOString();
        
        if (oldPrice !== updatedProduct.price) {
          hasChanges = true;
          console.log(`Updated price for ${item.product.name} from ${oldPrice} to ${updatedProduct.price}`);
        }
      }
    });
    
    if (hasChanges) {
      // Recalculate cart totals and save without reordering
      this.recalculateCartTotals(cart);
      // Update cart without triggering setCurrentCart merging logic
      this.cartSubject.next(cart);
      this.saveCartToStorage(cart);
    }
  }

  // Observable for cart items (for components that need it)
  get cartItems$(): Observable<CartItem[]> {
    return new Observable(observer => {
      this.cart$.subscribe(cart => {
        observer.next(cart ? cart.items : []);
      });
    });
  }


  // Guest cart methods
  getGuestCart(sessionId: string): Observable<Cart> {
    return this.http.get<Cart>(`http://localhost:8080/api/guest/cart/${sessionId}`);
  }

  createGuestCart(sessionId: string): Observable<Cart> {
    return this.http.post<Cart>(`http://localhost:8080/api/guest/cart/${sessionId}`, {});
  }

  addItemToGuestCart(sessionId: string, cartItem: CartItem): Observable<Cart> {
    return this.http.post<Cart>(`http://localhost:8080/api/guest/cart/${sessionId}/add-item`, cartItem);
  }

  updateGuestCartItem(itemId: number, cartItem: CartItem): Observable<Cart> {
    return this.http.put<Cart>(`http://localhost:8080/api/guest/cart/item/${itemId}`, cartItem);
  }

  removeGuestCartItem(itemId: number): Observable<any> {
    return this.http.delete(`http://localhost:8080/api/guest/cart/item/${itemId}`);
  }

  clearGuestCart(sessionId: string): Observable<any> {
    return this.http.delete(`http://localhost:8080/api/guest/cart/${sessionId}`);
  }

  mergeGuestCartToUser(sessionId: string, userId: number): Observable<Cart> {
    return this.http.post<Cart>(`http://localhost:8080/api/guest/cart/${sessionId}/merge-to-user/${userId}`, {});
  }

  // Smart add to cart method that handles both authenticated and guest users
  addToCart(product: Product, quantity: number, variant?: string): void {
    if (this.authService.isAuthenticated()) {
      // User is authenticated, use regular cart
      this.addToCartAuthenticated(product, quantity, variant);
    } else {
      // User is guest, use guest cart
      this.addToCartGuest(product, quantity, variant);
    }
  }

  private addToCartAuthenticated(product: Product, quantity: number, variant?: string): void {
    const user = this.authService.getCurrentUser();
    if (!user || !user.id) {
      this.notificationService.error('Please login again.');
      return;
    }

    const cartItem: Partial<CartItem> = {
      productId: product.id,
      quantity: quantity,
      price: product.price,
      // Persist variant to backend in compatibility field; keep local size in sync
      compatibility: variant || 'Universal',
      size: variant || 'Universal'
    };

    this.addItemToUserCart(user.id, cartItem).subscribe({
      next: (updatedCart) => {
        // If backend doesn't echo back size, patch it locally for the just-added item
        try {
          const patched = { ...updatedCart } as Cart;
          if (variant && Array.isArray(patched.items)) {
            const candidate = [...patched.items]
              .reverse()
              .find(i => i.productId === product.id && (!i.size || i.size === 'Universal'));
            if (candidate) {
              candidate.size = variant;
              // Ensure product data is preserved
              if (!candidate.product) {
                candidate.product = product;
              }
            }
          }
          this.setCurrentCart(patched);
          this.bringItemToTop(product.id, variant || 'Universal');
        } catch {
          this.setCurrentCart(updatedCart);
          this.bringItemToTop(product.id, variant || 'Universal');
        }
        this.notificationService.success(`${product.name} added to cart!`);
      },
      error: (error) => {
        console.error('Error adding item to cart:', error);
        this.notificationService.error('Failed to add item to cart. Please try again.');
      }
    });
  }

  private addToCartGuest(product: Product, quantity: number, variant?: string): void {
    const sessionId = this.authService.getGuestSessionId();

    // Ensure we have a local cart
    let cart = this.getCurrentCart();
    if (!cart) {
      cart = {
        id: 0,
        userId: undefined,
        sessionId,
        items: [],
        totalPrice: 0,
        totalQuantity: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any;
      this.setCurrentCart(cart);
    }

    const localItem: CartItem = {
      id: Date.now(),
      cartId: cart?.id || 0,
      productId: product.id,
      product: product,
      quantity: quantity,
      price: product.price,
      compatibility: product.compatibility,
      size: variant || 'Universal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.addItemToCartLocal(localItem);
    this.bringItemToTop(product.id, variant || 'Universal');
    this.notificationService.success(`${product.name} added to cart!`);
  }

  // -------------------- CHECKOUT SESSION --------------------
  private toLeanCheckoutItems(items: CartItem[]): Array<{productId: number; size: string; quantity: number; price: number;}> {
    return items.map(i => ({
      productId: i.productId,
      size: (i.size || (i as any).compatibility || 'Universal'),
      quantity: i.quantity,
      // Persist numeric price only
      price: Number(i.price)
    }));
  }

  private saveCheckoutToStorage(items: CartItem[] | null): void {
    try {
      if (items && items.length > 0) {
        const lean = this.toLeanCheckoutItems(items);
        localStorage.setItem(this.checkoutKey, JSON.stringify(lean));
      } else {
        localStorage.removeItem(this.checkoutKey);
      }
    } catch (e) {
      // If quota exceeded, fall back to only first N items
      try {
        if (items && items.length > 0) {
          const lean = this.toLeanCheckoutItems(items.slice(0, 20));
          localStorage.setItem(this.checkoutKey, JSON.stringify(lean));
        }
      } catch {}
    }
  }

  private loadCheckoutFromStorage(): void {
    try {
      const data = localStorage.getItem(this.checkoutKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          // Rehydrate using current cart product snapshots when available
          const cart = this.getCurrentCart();
          const rehydrated: CartItem[] = parsed.map((p: any) => {
            const product = cart?.items?.find(ci => ci.productId === p.productId)?.product;
            return {
              id: 0,
              cartId: cart?.id || 0,
              productId: p.productId,
              product: product || undefined as any,
              quantity: Number(p.quantity) || 1,
              price: Number(p.price) || 0,
              compatibility: undefined as any,
              size: p.size || 'Universal',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            } as CartItem;
          });
          this.checkoutSubject.next(rehydrated);

          // If some items lack product details (e.g., Buy Now in guest mode),
          // fetch product data by ID and update the checkout stream unobtrusively.
          const itemsNeedingHydration = rehydrated.filter(i => !i.product);
          if (itemsNeedingHydration.length > 0) {
            try {
              itemsNeedingHydration.forEach(item => {
                this.productService.getProductById(item.productId).subscribe({
                  next: (prod) => {
                    const current = this.checkoutSubject.value || [];
                    const idx = current.findIndex(ci => ci.productId === item.productId && ci.size === item.size);
                    if (idx !== -1) {
                      const updated = { ...current[idx], product: prod, price: current[idx].price || prod.price } as CartItem;
                      const next = [...current];
                      next[idx] = updated;
                      this.checkoutSubject.next(next);
                    }
                  },
                  error: () => {
                    // Silently ignore; UI will use placeholders
                  }
                });
              });
            } catch {}
          }
        } else {
          this.checkoutSubject.next(null);
        }
      }
    } catch {
      localStorage.removeItem(this.checkoutKey);
    }
  }

  beginCheckoutFromCart(): void {
    const selected = this.getSelectedItems();
    // In-memory: full items for immediate render
    const sessionItems: CartItem[] = JSON.parse(JSON.stringify(selected));
    this.checkoutSubject.next(sessionItems);
    // Persist lean snapshot to avoid localStorage quota issues
    this.saveCheckoutToStorage(sessionItems);
  }

  beginCheckoutForProduct(product: Product, quantity: number, variant: string): void {
    const item: CartItem = {
      id: 0,
      cartId: 0,
      productId: product.id,
      product: product,
      quantity: quantity,
      price: product.price,
      compatibility: product.compatibility,
      size: variant || 'Universal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const sessionItems: CartItem[] = [item];
    this.checkoutSubject.next(sessionItems);
    this.saveCheckoutToStorage(sessionItems);
  }

  getCheckoutItems(): CartItem[] {
    const current = this.checkoutSubject.value;
    return current ? current : [];
  }

  clearCheckoutSession(): void {
    this.checkoutSubject.next(null);
    this.saveCheckoutToStorage(null);
  }

  // Remove purchased items from the cart and sync with backend when authenticated
  removePurchasedItems(purchased: CartItem[]): void {
    if (!purchased || purchased.length === 0) return;
    
    // Optimistically remove locally for immediate UX
    purchased.forEach(it => this.removeFromCart(it.productId, it.size || 'Universal'));

    // If authenticated, sync with server to ensure consistency
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getCurrentUser();
      if (user) {
        // Instead of trying to remove specific items, reload the entire cart from server
        // This ensures we have the most up-to-date state and avoids 404 errors
        this.loadCartForUser(user.id);
      }
    }
  }

  // Clear entire cart after successful checkout
  clearEntireCart(): void {
    const cart = this.getCurrentCart();
    if (!cart) return;

    // If authenticated, clear server cart
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getCurrentUser();
      if (user) {
        this.clearCart(user.id).subscribe({
          next: () => {
            // Clear local cart after server confirmation
            this.setCurrentCart(null);
            // Also clear localStorage to ensure complete cleanup
            this.clearCartFromStorage();
          },
          error: (error) => {
            console.error('Error clearing server cart:', error);
            // Still clear local cart even if server call fails
            this.setCurrentCart(null);
            this.clearCartFromStorage();
          }
        });
      } else {
        // No user data, just clear local cart
        this.setCurrentCart(null);
        this.clearCartFromStorage();
      }
    } else {
      // For guest users, just clear local cart
      this.setCurrentCart(null);
      this.clearCartFromStorage();
    }
  }

  // Clear cart from localStorage
  private clearCartFromStorage(): void {
    try {
      localStorage.removeItem('sun-racing-cart');
    } catch (error) {
      console.error('Error clearing cart from localStorage:', error);
    }
  }

  private handleNavigation(): void {
    // If we are not on /checkout anymore, clear the session
    const path = location.pathname || '';
    if (!path.endsWith('/checkout')) {
      this.clearCheckoutSession();
    }
  }

  // Apply server cart but preserve existing product snapshots to avoid UI flicker
  applyServerCartPreserveProduct(serverCart: Cart): void {
    try {
      const current = this.getCurrentCart();
      if (current && Array.isArray(current.items) && Array.isArray((serverCart as any).items)) {
        const currentMap = new Map<string, CartItem>();
        current.items.forEach(i => {
          const key = `${i.productId}-${(i.size || i.compatibility || 'Universal')}`;
          currentMap.set(key, i);
        });
        (serverCart as any).items.forEach((si: CartItem) => {
          // Map backend compatibility field to frontend size field
          if ((si as any).compatibility && !si.size) {
            si.size = (si as any).compatibility;
          }
          if (si.size && !(si as any).compatibility) {
            (si as any).compatibility = si.size;
          }
          
          const key = `${si.productId}-${(si.size || (si as any).compatibility || 'Universal')}`;
          const match = currentMap.get(key);
          if (match) {
            // Preserve product data if missing
            if (!si.product && match.product) {
              (si as any).product = match.product;
            }
            // Preserve variant information if missing or corrupted
            if (!si.size && match.size) {
              si.size = match.size;
            }
            if (!(si as any).compatibility && match.compatibility) {
              (si as any).compatibility = match.compatibility;
            }
            // Ensure size and compatibility are consistent
            if (si.size && !(si as any).compatibility) {
              (si as any).compatibility = si.size;
            }
            if ((si as any).compatibility && !si.size) {
              si.size = (si as any).compatibility;
            }
          }
        });
      }
    } catch {}
    // Apply server cart without reordering by directly updating the subject
    this.cartSubject.next(serverCart);
    this.saveCartToStorage(serverCart);
  }

  // Load appropriate cart based on authentication status
  loadAppropriateCart(): void {
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getCurrentUser();
      if (user) {
        this.loadCartForUser(user.id);
      }
    } else {
      // Guest user: DO NOT wipe the local cart. Reuse localStorage snapshot if available.
      // If nothing in memory yet, try loading from storage; otherwise keep current items.
      const current = this.getCurrentCart();
      if (current && Array.isArray(current.items) && current.items.length > 0) {
        // Already have items in memory (e.g., added from product page) → keep as-is
        return;
      }
      // Try to load previously saved guest cart from localStorage
      try {
        const stored = localStorage.getItem('sun-racing-cart');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Normalize items array and filter out any items with invalid IDs
          parsed.items = Array.isArray(parsed.items) ? parsed.items.filter((item: any) => {
            // Remove items that might have stale server IDs
            return !item.id || item.id > 0;
          }) : [];
          this.cartSubject.next(parsed);
          return;
        }
      } catch {}

      // No stored cart; initialize a fresh empty guest cart tied to sessionId
      const sessionId = this.authService.getGuestSessionId();
      const emptyCart = {
        id: 0,
        userId: undefined,
        sessionId,
        items: [],
        totalPrice: 0,
        totalQuantity: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any;
      this.cartSubject.next(emptyCart);
    }
  }

  private loadGuestCart(sessionId: string): void {
    this.getGuestCart(sessionId).subscribe({
      next: (cart) => {
        this.setCurrentCart(cart);
      },
      error: (error) => {
        console.error('Error loading guest cart:', error);
        // If guest cart doesn't exist, create one
        this.createGuestCart(sessionId).subscribe({
          next: (newCart) => {
            this.setCurrentCart(newCart);
          },
          error: (createError) => {
            console.error('Error creating guest cart:', createError);
          }
        });
      }
    });
  }

  // Local cart management for demo purposes
  addItemToCartLocal(cartItem: CartItem): void {
    const cart = this.getCurrentCart();
    if (!cart) return;

    // Check if item already exists with the same product AND same variant
    const normalizedSize = cartItem.size || 'Universal';
    const existingItem = cart.items.find(
      item => item.productId === cartItem.productId && (((item.size || item.compatibility || 'Universal')) === normalizedSize)
    );

    if (existingItem) {
      // Update quantity for same product + same variant
      existingItem.quantity += cartItem.quantity;
      existingItem.updatedAt = new Date().toISOString();
    } else {
      // Add new item (different variant or new product) - initialize selected property to false by default
      cartItem.selected = false;
      cart.items.push(cartItem);
    }

    // Recalculate totals and update without reordering
    this.recalculateCartTotals(cart);
    this.cartSubject.next(cart);
    this.saveCartToStorage(cart);
  }

  private recalculateCartTotals(cart: Cart): void {
    cart.totalQuantity = cart.items.reduce((total, item) => total + item.quantity, 0);
    cart.totalPrice = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    cart.updatedAt = new Date().toISOString();
  }

  // Update quantity method
  updateQuantity(productId: number, variant: string, newQuantity: number): void {
    const cart = this.getCurrentCart();
    if (cart) {
      const item = cart.items.find(i => i.productId === productId && (((i.size || i.compatibility || 'Universal') === (variant || 'Universal'))));
      if (item) {
        if (newQuantity <= 0) {
          // Remove item if quantity is 0 or negative
          this.removeFromCart(productId, variant);
        } else {
          // Update quantity locally first for responsive UI
          item.quantity = newQuantity;
          item.updatedAt = new Date().toISOString();
          this.recalculateCartTotals(cart);
          // Update cart without reordering, then bring item to top
          this.cartSubject.next(cart);
          this.saveCartToStorage(cart);
          // Surface recent change to the top for better visibility
          this.bringItemToTop(productId, item.size || item.compatibility || 'Universal');

          // If authenticated and item persisted server-side, sync to backend
          if (this.authService.isAuthenticated() && typeof item.id === 'number' && item.id > 0) {
            const payload: CartItem = { ...item } as any;
            this.updateCartItem(item.id, payload).subscribe({
              next: (serverCart) => {
                // Preserve product snapshots to avoid image flicker during updates
                this.applyServerCartPreserveProduct(serverCart);
                // Keep the recently edited item on top even after server echo
                this.bringItemToTop(productId, item.size || item.compatibility || 'Universal');
              },
              error: () => {
                // Keep local state; user can refresh later
              }
            });
          }
        }
      }
    }
  }

  // Remove from cart method
  removeFromCart(productId: number, variant: string): void {
    const cart = this.getCurrentCart();
    if (cart) {
      const itemIndex = cart.items.findIndex(i => i.productId === productId && (((i.size || i.compatibility || 'Universal') === (variant || 'Universal'))));
      if (itemIndex !== -1) {
        cart.items.splice(itemIndex, 1);
        this.recalculateCartTotals(cart);
        // Update cart without reordering
        this.cartSubject.next(cart);
        this.saveCartToStorage(cart);
      }
    }
  }

  // Get cart total
  getCartTotal(): number {
    return this.getCartTotalPrice();
  }

  // Get available sizes (placeholder method)
  getAvailableSizes(product: Product): string[] {
    // For motorcycle parts, we might have different sizes or compatibility options
    return ['Universal', 'Small', 'Medium', 'Large', 'XL'];
  }

  // localStorage methods for cart persistence
  private saveCartToStorage(cart: Cart | null): void {
    if (cart) {
      localStorage.setItem('sun-racing-cart', JSON.stringify(cart));
    } else {
      localStorage.removeItem('sun-racing-cart');
    }
  }

  private loadCartFromStorage(): void {
    try {
      const cartData = localStorage.getItem('sun-racing-cart');
      if (cartData) {
        const cart = JSON.parse(cartData);
        // Normalize items after load
        cart.items = Array.isArray(cart.items) ? cart.items : [];
        this.cartSubject.next(cart);
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      // Clear invalid data
      localStorage.removeItem('sun-racing-cart');
    }
  }

  // Toggle item selection for checkout
  toggleItemSelection(productId: number, variant: string): void {
    const cart = this.cartSubject.value;
    if (!cart) return;

    const item = cart.items.find(i => i.productId === productId && (((i.size || i.compatibility || 'Universal') === (variant || 'Universal'))));
    if (item) {
      item.selected = !item.selected;
      this.cartSubject.next({ ...cart });
      this.saveCartToStorage(cart);
    }
  }

  // Select all items
  selectAllItems(): void {
    const cart = this.cartSubject.value;
    if (!cart) return;

    cart.items.forEach(item => item.selected = true);
    this.cartSubject.next({ ...cart });
    this.saveCartToStorage(cart);
  }

  // Deselect all items
  deselectAllItems(): void {
    const cart = this.cartSubject.value;
    if (!cart) return;

    cart.items.forEach(item => item.selected = false);
    this.cartSubject.next({ ...cart });
    this.saveCartToStorage(cart);
  }

  // Get selected items
  getSelectedItems(): CartItem[] {
    const cart = this.cartSubject.value;
    if (!cart) return [];
    return cart.items.filter(item => item.selected);
  }

  // Convenience: select only the specified product/variant for checkout
  selectOnlyItem(productId: number, variant: string): void {
    const cart = this.cartSubject.value;
    if (!cart || !Array.isArray(cart.items)) return;
    const normalized = variant || 'Universal';
    // Do not pre-select items; just ensure no accidental selection set for the new item
    const match = cart.items.find(i => i.productId === productId && (((i.size || i.compatibility || 'Universal')) === normalized));
    if (match) match.selected = false as any;
    this.cartSubject.next({ ...cart });
    this.saveCartToStorage(cart);
  }

  // Move the most recently added item to the top for better visibility
  bringItemToTop(productId: number, variant: string): void {
    const cart = this.cartSubject.value;
    if (!cart || !Array.isArray(cart.items)) return;
    const normalized = variant || 'Universal';
    const idx = cart.items.findIndex(i => i.productId === productId && (((i.size || i.compatibility || 'Universal')) === normalized));
    if (idx > 0) {
      const [item] = cart.items.splice(idx, 1);
      // Ensure not selected by default
      (item as any).selected = false;
      cart.items.unshift(item);
      this.cartSubject.next({ ...cart });
      this.saveCartToStorage(cart);
    }
  }

  // Get selected items total
  getSelectedItemsTotal(): number {
    const selectedItems = this.getSelectedItems();
    return selectedItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  // Get selected items quantity
  getSelectedItemsQuantity(): number {
    const selectedItems = this.getSelectedItems();
    return selectedItems.reduce((total, item) => total + item.quantity, 0);
  }

  // Get shipping fee based on selected items total
  getShippingFee(): number {
    const selectedTotal = this.getSelectedItemsTotal();
    return selectedTotal < 1000 ? 30 : 0;
  }

  // Get total including shipping
  getTotalWithShipping(): number {
    return this.getSelectedItemsTotal() + this.getShippingFee();
  }


  // Update item variant
  updateItemVariant(productId: number, oldVariant: string, newVariant: string): boolean {
    const cart = this.cartSubject.value;
    if (!cart) return false;

    // Find the item by productId and current variant
    const item = cart.items.find(i => 
      i.productId === productId && 
      ((i.size || i.compatibility || 'Universal') === (oldVariant || 'Universal'))
    );
    
    if (item) {
      // Check if there's already an item with the new variant
      const existingNewVariant = cart.items.find(i => 
        i.productId === productId && 
        ((i.size || i.compatibility || 'Universal') === (newVariant || 'Universal'))
      );
      
      if (existingNewVariant) {
        // Don't merge - just show a message that variant already exists
        this.notificationService.error(`Variant "${newVariant}" already exists in cart. Please remove the existing item first or add a different quantity.`);
        return false;
      }
      
      // No existing item with new variant, just update the current item
      item.size = newVariant;
      item.compatibility = newVariant; // Keep both in sync
      item.updatedAt = new Date().toISOString();
      
      // Recalculate totals
      this.recalculateCartTotals(cart);
      
      // Update the cart subject to trigger UI updates
      this.cartSubject.next({ ...cart });
      this.saveCartToStorage(cart);
      
      // If user is authenticated and item has a persisted id, sync to server
      if (this.authService.isAuthenticated() && typeof item.id === 'number' && item.id > 0) {
        // Ensure backend receives compatibility equal to selected size
        const payload: any = { ...item, compatibility: newVariant };
        this.updateCartItem(item.id, payload).subscribe({
          next: (updatedCart) => {
            // Apply server response but preserve local changes
            this.applyServerCartPreserveProduct(updatedCart);
            this.bringItemToTop(productId, newVariant);
          },
          error: (error) => {
            console.error('Error updating variant on server:', error);
            // Keep local changes even if server update fails
            this.bringItemToTop(productId, newVariant);
          }
        });
      } else {
        // For guest users, just bring item to top
        this.bringItemToTop(productId, newVariant);
      }
      
      return true; // Successfully updated variant
    }
    
    return false; // Item not found
  }
}