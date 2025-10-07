import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, Subscription, of } from 'rxjs';
import { switchMap, distinctUntilChanged, catchError } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { CartService } from './cart.service';

@Injectable({
  providedIn: 'root'
})
export class ProductUpdateWatcherService {
  private apiUrl = 'http://localhost:8080/api/products';
  private lastUpdateTime: string | null = null;
  private updateCheckInterval = 30000; // Check every 30 seconds
  private subscription: Subscription | null = null;
  private isWatching = false;

  constructor(
    private http: HttpClient,
    private cartService: CartService
  ) {}

  startWatching(): void {
    if (this.isWatching) return;
    
    this.isWatching = true;
    console.log('Starting product update watcher...');
    
    // Check for updates every 30 seconds
    this.subscription = interval(this.updateCheckInterval)
      .pipe(
        switchMap(() => this.checkForProductUpdates()),
        catchError(error => {
          console.error('Error checking for product updates:', error);
          return [];
        })
      )
      .subscribe(updatedProducts => {
        if (updatedProducts.length > 0) {
          console.log('Product updates detected:', updatedProducts);
          this.cartService.refreshCartProductData();
        }
      });
  }

  stopWatching(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    this.isWatching = false;
    console.log('Stopped product update watcher');
  }

  private checkForProductUpdates(): Observable<Product[]> {
    // Get the last update time from localStorage
    const storedUpdateTime = localStorage.getItem('lastProductUpdateTime');
    
    // If we don't have a stored time, set it to now and return empty
    if (!storedUpdateTime) {
      this.lastUpdateTime = new Date().toISOString();
      localStorage.setItem('lastProductUpdateTime', this.lastUpdateTime);
      return of([]);
    }

    this.lastUpdateTime = storedUpdateTime;

    // Check for products updated since last check
    return this.http.get<{success: boolean, products: Product[]}>(`${this.apiUrl}/updated-since/${this.lastUpdateTime}`)
      .pipe(
        switchMap(response => {
          if (response.success && response.products && response.products.length > 0) {
            // Update the last check time
            const newUpdateTime = new Date().toISOString();
            localStorage.setItem('lastProductUpdateTime', newUpdateTime);
            this.lastUpdateTime = newUpdateTime;
            
            return [response.products];
          }
          return of([]);
        }),
        catchError(error => {
          console.error('Error checking for product updates:', error);
          return of([]);
        })
      );
  }

  // Method to manually trigger update check (useful for testing)
  forceUpdateCheck(): void {
    this.checkForProductUpdates().subscribe(updatedProducts => {
      if (updatedProducts.length > 0) {
        console.log('Manual update check - products updated:', updatedProducts);
        this.cartService.refreshCartProductData();
      }
    });
  }

  // Method to reset the update time (useful when admin makes changes)
  resetUpdateTime(): void {
    this.lastUpdateTime = new Date().toISOString();
    localStorage.setItem('lastProductUpdateTime', this.lastUpdateTime);
  }
}
