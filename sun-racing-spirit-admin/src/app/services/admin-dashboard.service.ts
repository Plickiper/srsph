import { Injectable } from '@angular/core';
import { Observable, combineLatest, map, catchError, of, forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AdminProductService, Product } from './admin-product.service';
import { AdminUserService, User } from './admin-user.service';
import { AdminOrderService, Order, OrderStats } from './admin-order.service';

export interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  pendingOrders: number;
  completedOrders: number;
  processingOrders: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalVariants: number;
  lowStockVariants: number;
  outOfStockVariants: number;
}

export interface TopProduct {
  id: number;
  name: string;
  category: string;
  sales: number;
  revenue: number;
  stockQuantity?: number;
  rating?: number;
  categoryCount?: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentOrders: Order[];
  topProducts: TopProduct[];
  topCategories: TopProduct[];
  lowStockProducts: Product[];
  recentUsers: User[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminDashboardService {
  private cache: { data: DashboardData | null, timestamp: number } = { data: null, timestamp: 0 };
  private readonly CACHE_DURATION = 30000; // 30 seconds cache

  constructor(
    private productService: AdminProductService,
    private userService: AdminUserService,
    private orderService: AdminOrderService
  ) {}

  getDashboardData(): Observable<DashboardData> {
    // Check cache first
    const now = Date.now();
    if (this.cache.data && (now - this.cache.timestamp) < this.CACHE_DURATION) {
      return of(this.cache.data);
    }

    // Optimize by fetching only essential data and processing efficiently
    return combineLatest([
      this.productService.getAllProducts().pipe(
        map((response: any) => response.success ? response.products || [] : []),
        catchError(() => of([]))
      ),
      this.userService.getAllUsers().pipe(catchError(() => of([]))),
      this.orderService.getAllOrders().pipe(catchError(() => of([])))
    ]).pipe(
      map(([products, users, orders]) => {
        // Process orders data once instead of multiple calls
        const orderStats = this.calculateOrderStats(orders);
        const recentOrders = this.getRecentOrdersFromData(orders, 5);
        const lowStockThreshold = 10;
        
        // Analyze products and variants
        let lowStockProducts = 0;
        let outOfStockProducts = 0;
        let totalVariants = 0;
        let lowStockVariants = 0;
        let outOfStockVariants = 0;
        
        (Array.isArray(products) ? products : []).forEach((product: Product) => {
          // Check if product has variants (variants are already parsed by AdminProductService)
          if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
            // Product has variants
            totalVariants += product.variants.length;
            
            let hasLowStock = false;
            let hasOutOfStock = false;
            
            product.variants.forEach((variant: any) => {
              if (variant.stockQuantity === 0) {
                outOfStockVariants++;
                hasOutOfStock = true;
              } else if (variant.stockQuantity <= lowStockThreshold) {
                lowStockVariants++;
                hasLowStock = true;
              }
            });
            
            if (hasOutOfStock) {
              outOfStockProducts++;
            }
            if (hasLowStock) {
              lowStockProducts++;
            }
          } else {
            // Product has no variants, check main stock
            if (product.stockQuantity === 0) {
              outOfStockProducts++;
            } else if (product.stockQuantity <= lowStockThreshold) {
              lowStockProducts++;
            }
          }
        });
        
        // Generate top products data based on actual sales
        const topProducts: TopProduct[] = this.generateTopProducts(products, orders);
        
        // Generate top categories data based on actual sales
        const topCategories: TopProduct[] = this.generateTopCategories(products, orders);

        // Add safety checks for array operations
        const recentUsers = Array.isArray(users) ? users
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5) : [];

        // Filter out admin/staff users to only count customers
        const customerUsers = Array.isArray(users) ? users.filter(user => user.role === 'CUSTOMER') : [];
        
        // Calculate revenue only from completed orders (excluding shipping fee)
        const completedOrdersRevenue = Array.isArray(orders) ? orders
          .filter((order: any) => order.status === 'DELIVERED')
          .reduce((sum: number, order: any) => {
            // Use totalPrice which excludes shipping fee
            return sum + (order.totalPrice || 0);
          }, 0) : 0;

        const stats: DashboardStats = {
          totalProducts: products.length,
          totalOrders: orderStats.totalOrders,
          totalRevenue: completedOrdersRevenue, // Only count revenue from completed orders
          totalUsers: customerUsers.length, // Only count customers
          pendingOrders: orderStats.pendingOrders,
          completedOrders: orderStats.completedOrders,
          processingOrders: orderStats.processingOrders,
          lowStockProducts: lowStockProducts,
          outOfStockProducts: outOfStockProducts,
          totalVariants: totalVariants,
          lowStockVariants: lowStockVariants,
          outOfStockVariants: outOfStockVariants
        };

        // Return data immediately without additional API calls for ratings
        const payload: DashboardData = {
          stats,
          recentOrders,
          topProducts: topProducts.map(tp => ({ ...tp, rating: 0 })), // Set default rating
          topCategories,
          lowStockProducts: [],
          recentUsers
        };
        
        // Update cache
        this.cache.data = payload;
        this.cache.timestamp = now;
        
        return payload;
      }),
      catchError(error => {
        console.error('Error loading dashboard data:', error);
        // Return fallback data
        return of({
          stats: {
            totalProducts: 0,
            totalOrders: 0,
            totalRevenue: 0,
            totalUsers: 0,
            pendingOrders: 0,
            completedOrders: 0,
            processingOrders: 0,
            lowStockProducts: 0,
            outOfStockProducts: 0,
            totalVariants: 0,
            lowStockVariants: 0,
            outOfStockVariants: 0
          },
          recentOrders: [],
          topProducts: [],
          topCategories: [],
          lowStockProducts: [],
          recentUsers: []
        });
      })
    );
  }

  getStats(): Observable<DashboardStats> {
    return this.getDashboardData().pipe(
      map(data => data.stats)
    );
  }

  getRecentOrders(): Observable<Order[]> {
    return this.orderService.getRecentOrders(5);
  }

  getTopProducts(): Observable<TopProduct[]> {
    return this.getDashboardData().pipe(
      map(data => data.topProducts)
    );
  }

  getLowStockProducts(): Observable<Product[]> {
    return this.productService.getAllProducts().pipe(
      map((response: any) => {
        const products = response.success ? response.products || [] : [];
        return products.filter((p: Product) => p.stockQuantity <= 10);
      }),
      catchError(() => of([]))
    );
  }

  private generateTopProducts(products: any[], orders: any[]): TopProduct[] {
    // Create a map to track product sales
    const productSales = new Map<number, { sales: number, revenue: number, category: string }>();
    
    // Consider only completed sales (DELIVERED)
    const completed = Array.isArray(orders) ? orders.filter(o => (o.status === 'DELIVERED')) : [];
    // Process orders to calculate sales
    completed.forEach(order => {
      if (order.items) {
        order.items.forEach((item: any) => {
          const productId = item.product?.id;
          if (productId) {
            const quantity = item.quantity || 0;
            const price = item.price || 0;
            
            if (productSales.has(productId)) {
              const current = productSales.get(productId)!;
              current.sales += quantity;
              current.revenue += price * quantity;
            } else {
              productSales.set(productId, {
                sales: quantity,
                revenue: price * quantity,
                category: item.product?.category || 'Uncategorized'
              });
            }
          }
        });
      }
    });

    // Convert to TopProduct array and sort by sales
    const topProducts: TopProduct[] = Array.from(productSales.entries())
      .map(([productId, data]) => {
        const product = products.find(p => p.id === productId);
        return {
          id: productId,
          name: product?.name || 'Unknown Product',
          category: data.category,
          sales: data.sales,
          revenue: data.revenue,
          rating: 0, // filled later by rating stats fetch in dashboard UI if needed
          categoryCount: products.filter(p => p.category === data.category).length
        };
      })
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5); // Top 5 products

    return topProducts;
  }

  private generateTopCategories(products: any[], orders: any[]): TopProduct[] {
    // Create a map to track category sales
    const categorySales = new Map<string, { sales: number, revenue: number }>();
    
    // Consider only completed sales (DELIVERED)
    const completed = Array.isArray(orders) ? orders.filter(o => (o.status === 'DELIVERED')) : [];
    // Process orders to calculate sales by category
    completed.forEach(order => {
      if (order.items) {
        order.items.forEach((item: any) => {
          const category = item.product?.category || 'Uncategorized';
          const quantity = item.quantity || 0;
          const price = item.price || 0;
          
          if (categorySales.has(category)) {
            const current = categorySales.get(category)!;
            current.sales += quantity;
            current.revenue += price * quantity;
          } else {
            categorySales.set(category, {
              sales: quantity,
              revenue: price * quantity
            });
          }
        });
      }
    });

    // Convert to TopProduct array and sort by sales
    const topCategories: TopProduct[] = Array.from(categorySales.entries())
      .map(([category, data]) => {
        return {
          id: 0, // No specific ID for categories
          name: category, // Use category name as the display name
          category: category,
          sales: data.sales,
          revenue: data.revenue,
          rating: 0, // Not applicable for categories
          categoryCount: products.filter(p => p.category === category).length
        };
      })
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5); // Top 5 categories

    return topCategories;
  }

  private calculateOrderStats(orders: any[]): OrderStats {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const pendingOrders = orders.filter(order => order.status === 'PENDING').length;
    const completedOrders = orders.filter(order => order.status === 'DELIVERED').length;
    const processingOrders = orders.filter(order => order.status === 'SHIPPED').length;
    const cancelledOrders = orders.filter(order => order.status === 'CANCELLED').length;

    return {
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      processingOrders,
      cancelledOrders
    };
  }

  private getRecentOrdersFromData(orders: any[], limit: number): any[] {
    return orders
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  // Method to clear cache when data is updated
  clearCache(): void {
    this.cache.data = null;
    this.cache.timestamp = 0;
  }
}
