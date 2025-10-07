import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private apiUrl = 'http://localhost:8080/api/orders';

  constructor(private http: HttpClient) {}

  getAll(status?: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'): Observable<any[]> {
    const param = status ? `?status=${status}` : '';
    return this.http.get<{success: boolean, orders: any[]}>(`${this.apiUrl}${param}`)
      .pipe(
        map(response => {
          if (response.success && response.orders) {
            return response.orders;
          }
          return [];
        })
      );
  }

  updateStatus(orderId: number, status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${orderId}/status`, { status });
  }

  uploadWaybillProof(orderId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.put<any>(`${this.apiUrl}/${orderId}/waybill`, formData);
  }

  uploadDeliveryProof(orderId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.put<any>(`${this.apiUrl}/${orderId}/delivery-proof`, formData);
  }
}


