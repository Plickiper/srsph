import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  compatibility: string;
  product?: {
    id: number;
    name: string;
    brand: string;
    imageUrl: string;
    category: string;
    partNumber: string;
  };
}

export interface Order {
  id: number;
  userId: number;
  customerName: string;
  customerEmail: string;
  status: string;
  totalAmount: number;
  shippingAddress: string;
  billingAddress: string;
  paymentMethod: string;
  paymentStatus: string;
  trackingNumber?: string;
  notes?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  processingOrders: number;
  cancelledOrders: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminOrderService {
  private apiUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  getAllOrders(): Observable<Order[]> {
    return this.http.get<{success: boolean, orders: any[]}>(`${this.apiUrl}/orders`).pipe(
      map(response => {
        if (response.success && response.orders) {
          return response.orders.map(order => {
        const itemsTotal = order.totalAmount || 0;
        const shippingFee = itemsTotal < 1000 ? 30 : 0;
        const grandTotal = itemsTotal + shippingFee;
        
        return {
          id: order.id,
          userId: order.user?.id || 0,
          customerName: order.recipientName || 'N/A',
          customerEmail: order.recipientEmail || 'N/A',
          status: order.status,
          totalAmount: grandTotal, // Include shipping fee in total
          shippingAddress: order.deliveryAddress || 'N/A',
          billingAddress: order.deliveryAddress || 'N/A',
          paymentMethod: order.paymentMethod || 'COD',
          paymentStatus: 'Paid',
          items: order.items || [],
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        };
      });
        } else {
          return [];
        }
      })
    );
  }

  getOrder(id: number): Observable<Order> {
    return this.getAllOrders().pipe(
      map(orders => orders.find(order => order.id === id)!)
    );
  }

  getOrderStats(): Observable<OrderStats> {
    return this.getAllOrders().pipe(
      map(orders => {
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
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
      })
    );
  }

  getRecentOrders(limit: number = 5): Observable<Order[]> {
    return this.getAllOrders().pipe(
      map(orders => orders
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit)
      )
    );
  }

  updateOrderStatus(id: number, status: string): Observable<Order> {
    // TODO: Implement actual API call
    return this.getOrder(id).pipe(
      map(order => ({ ...order, status, updatedAt: new Date().toISOString() }))
    );
  }
}
