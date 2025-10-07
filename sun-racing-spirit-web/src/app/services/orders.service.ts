import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private apiUrl = 'http://localhost:8080/api/orders';

  constructor(private http: HttpClient) {}

  createOrder(payload: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload);
  }

  getMyOrders(userId: number): Observable<any[]> {
    return this.http.get<{success: boolean, orders: any[]}>(`${this.apiUrl}/user/${userId}`)
      .pipe(
        map(response => {
          if (response.success && response.orders) {
            return response.orders;
          }
          return [];
        })
      );
  }
}


