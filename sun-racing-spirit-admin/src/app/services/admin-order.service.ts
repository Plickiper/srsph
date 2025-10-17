import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, of, throwError } from 'rxjs';

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

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      throw new Error('User not authenticated');
    }

    const currentUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
    const adminRole = currentUser?.role || 'SUPER_ADMIN';

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Admin-Role': adminRole
    });
  }

  private handleError(error: any): Observable<never> {
    console.error('Error in AdminOrderService:', error);
    return throwError(() => error);
  }

  getRecentOrders(limit: number = 10): Observable<Order[]> {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    return this.http.get<{success: boolean, data: {orders: any[], timestamp?: string}}>(`${this.apiUrl}/orders?limit=${limit}&sort=createdAt&order=desc&_t=${timestamp}`).pipe(
      map(response => {
        if (response.success && response.data && response.data.orders) {
          return response.data.orders.map(order => {
        const itemsTotal = order.totalAmount || 0; // This is items total from backend
        const shippingFee = itemsTotal < 1000 ? 30 : 0;
        const grandTotal = itemsTotal + shippingFee;
        
        return {
          id: order.id,
          userId: order.user?.id || 0,
          recipientName: order.recipientName || (order.user?.firstName && order.user?.lastName ? `${order.user.firstName} ${order.user.lastName}` : order.user?.username || 'N/A'),
          recipientPhone: order.recipientPhone || order.user?.phoneNumber || 'N/A',
          customerName: order.recipientName || (order.user?.firstName && order.user?.lastName ? `${order.user.firstName} ${order.user.lastName}` : order.user?.username || 'N/A'),
          customerEmail: order.user?.email || 'N/A',
          status: order.status,
          totalPrice: itemsTotal, // Items total without shipping
          totalAmount: grandTotal, // Include shipping fee in total
          deliveryAddress: order.deliveryAddress || 'N/A', // For modal template
          shippingAddress: order.deliveryAddress || 'N/A',
          billingAddress: order.deliveryAddress || 'N/A',
          paymentMethod: order.paymentMethod || 'COD',
          paymentStatus: 'Paid',
          items: order.items || [],
          user: order.user || null, // Include user object for modal template
          waybillProofUrl: order.waybillProofUrl || null, // For waybill proof display
          deliveryProofUrl: order.deliveryProofUrl || null, // For delivery proof display
          cancellationReason: order.cancellationReason || null, // For cancellation reason display
          cancelledAt: order.cancelledAt || null, // For cancellation date display
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

  getAllOrders(): Observable<Order[]> {
    return this.http.get<{success: boolean, data: {orders: any[]}}>(`${this.apiUrl}/orders`).pipe(
      map(response => {
        if (response.success && response.data && response.data.orders) {
          return response.data.orders.map(order => {
        const itemsTotal = order.totalAmount || 0; // This is items total from backend
        const shippingFee = itemsTotal < 1000 ? 30 : 0;
        const grandTotal = itemsTotal + shippingFee;
        
        return {
          id: order.id,
          userId: order.user?.id || 0,
          recipientName: order.recipientName || (order.user?.firstName && order.user?.lastName ? `${order.user.firstName} ${order.user.lastName}` : order.user?.username || 'N/A'),
          recipientPhone: order.recipientPhone || order.user?.phoneNumber || 'N/A',
          customerName: order.recipientName || (order.user?.firstName && order.user?.lastName ? `${order.user.firstName} ${order.user.lastName}` : order.user?.username || 'N/A'),
          customerEmail: order.user?.email || 'N/A',
          status: order.status,
          totalPrice: itemsTotal, // Items total without shipping
          totalAmount: grandTotal, // Include shipping fee in total
          deliveryAddress: order.deliveryAddress || 'N/A', // For modal template
          shippingAddress: order.deliveryAddress || 'N/A',
          billingAddress: order.deliveryAddress || 'N/A',
          paymentMethod: order.paymentMethod || 'COD',
          paymentStatus: 'Paid',
          items: order.items || [],
          user: order.user || null, // Include user object for modal template
          waybillProofUrl: order.waybillProofUrl || null, // For waybill proof display
          deliveryProofUrl: order.deliveryProofUrl || null, // For delivery proof display
          cancellationReason: order.cancellationReason || null, // For cancellation reason display
          cancelledAt: order.cancelledAt || null, // For cancellation date display
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        };
      });
        } else {
          return [];
        }
      }),
      catchError(error => {
        console.error('Error fetching orders:', error);
        return of([]);
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


  updateOrderStatus(id: number, status: string): Observable<Order> {
    const headers = this.getAuthHeaders();
    return this.http.put<Order>(`${this.apiUrl}/orders/${id}/status`, 
      { status }, 
      { headers }
    ).pipe(
      map(response => response as any),
      catchError(this.handleError)
    );
  }

  uploadWaybillProof(orderId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Create headers specifically for file upload - don't include Content-Type
    const token = localStorage.getItem('admin_token');
    const currentUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
    const adminRole = currentUser?.role || 'SUPER_ADMIN';
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Admin-Role': adminRole
      // Don't set Content-Type - let browser set it with boundary for multipart
    });
    
    return this.http.put<any>(`${this.apiUrl}/orders/${orderId}/waybill`, formData, { headers });
  }

  uploadDeliveryProof(orderId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Create headers specifically for file upload - don't include Content-Type
    const token = localStorage.getItem('admin_token');
    const currentUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
    const adminRole = currentUser?.role || 'SUPER_ADMIN';
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Admin-Role': adminRole
      // Don't set Content-Type - let browser set it with boundary for multipart
    });
    
    return this.http.put<any>(`${this.apiUrl}/orders/${orderId}/delivery-proof`, formData, { headers });
  }
}
