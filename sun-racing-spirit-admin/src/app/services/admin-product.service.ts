import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ProductVariant {
  model: string;
  price: number;
  stockQuantity: number;
}

export interface Product {
  id?: number;
  name: string;
  brand: string;
  category: string;
  partNumber: string;
  compatibility?: string;
  material?: string;
  price: number; // Base price (for backward compatibility)
  stockQuantity: number; // Total stock (for backward compatibility)
  variants?: ProductVariant[]; // Variant-specific pricing and stock
  description?: string;
  imageUrl?: string;
  images?: string[]; // Array of additional product images
  isPublished?: boolean;
  isFeatured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductRequest {
  id?: number;
  name: string;
  brand: string;
  category: string;
  partNumber: string;
  compatibility?: string;
  material?: string;
  price: number;
  stockQuantity: number;
  variants?: string | null; // JSON string for backend
  description?: string;
  imageUrl?: string | null;
  images?: string | null; // JSON string for backend
  isPublished?: boolean;
  isFeatured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductResponse {
  success: boolean;
  product?: Product;
  products?: Product[];
  message?: string;
  error?: string;
}

export interface RatingStatsResponse {
  averageRating: number;
  totalRatings: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminProductService {
  private apiUrl = 'http://localhost:8080/api/products';

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    // Get user from localStorage or session
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Admin-Role': user.role || 'SUPER_ADMIN'
    });
  }

  getAllProducts(): Observable<ProductResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<ProductResponse>(this.apiUrl, { headers })
      .pipe(
        map(response => {
          if (response.products) {
            response.products = response.products.map(product => this.parseProductImages(product));
          }
          return response;
        })
      );
  }

  getProductById(id: number): Observable<ProductResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<ProductResponse>(`${this.apiUrl}/${id}`, { headers })
      .pipe(
        map(response => {
          if (response.product) {
            response.product = this.parseProductImages(response.product);
          }
          return response;
        })
      );
  }

  createProduct(product: ProductRequest): Observable<ProductResponse> {
    const headers = this.getAuthHeaders();
    const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
    
    // Enhanced user name logic
    let currentUser = 'Admin'; // Default fallback
    
    if (user.firstName && user.lastName) {
      currentUser = `${user.firstName} ${user.lastName}`;
    } else if (user.username) {
      currentUser = user.username;
    } else if (user.role === 'SUPER_ADMIN') {
      currentUser = 'Super Admin';
    }
    
    const requestBody = {
      ...product,
      currentUser: currentUser
    };
    
    return this.http.post<ProductResponse>(this.apiUrl, requestBody, { headers });
  }

  updateProduct(id: number, product: ProductRequest): Observable<ProductResponse> {
    const headers = this.getAuthHeaders();
    const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
    
    // Enhanced user name logic
    let currentUser = 'Admin'; // Default fallback
    
    if (user.firstName && user.lastName) {
      currentUser = `${user.firstName} ${user.lastName}`;
    } else if (user.username) {
      currentUser = user.username;
    } else if (user.role === 'SUPER_ADMIN') {
      currentUser = 'Super Admin';
    }
    
    const requestBody = {
      ...product,
      currentUser: currentUser
    };
    
    return this.http.put<ProductResponse>(`${this.apiUrl}/${id}`, requestBody, { headers });
  }

  deleteProduct(id: number): Observable<ProductResponse> {
    const headers = this.getAuthHeaders();
    const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
    
    // Enhanced user name logic
    let currentUser = 'Admin'; // Default fallback
    
    if (user.firstName && user.lastName) {
      currentUser = `${user.firstName} ${user.lastName}`;
    } else if (user.username) {
      currentUser = user.username;
    } else if (user.role === 'SUPER_ADMIN') {
      currentUser = 'Super Admin';
    }
    
    const requestBody = {
      currentUser: currentUser
    };
    
    return this.http.delete<ProductResponse>(`${this.apiUrl}/${id}`, { 
      headers, 
      body: requestBody 
    });
  }

  getAllBrands(): Observable<string[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<string[]>(`${this.apiUrl}/brands`, { headers });
  }

  getAllCategories(): Observable<string[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<string[]>(`${this.apiUrl}/categories`, { headers });
  }

  getFeaturedProducts(): Observable<Product[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<{success: boolean, products: Product[]}>(`${this.apiUrl}/featured`, { headers })
      .pipe(
        // Transform the response to return just the products array
        map(response => response.products || [])
      );
  }

  getNewArrivals(): Observable<Product[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<{success: boolean, products: Product[]}>(`${this.apiUrl}/new-arrivals`, { headers })
      .pipe(
        // Transform the response to return just the products array
        map(response => response.products || [])
      );
  }

  // Ratings/statistics for a product (used by admin dashboard Most Rated)
  getProductRatingStats(productId: number): Observable<RatingStatsResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<RatingStatsResponse>(`http://localhost:8080/api/ratings/product/${productId}/stats`, { headers })
      .pipe(
        map((resp: any) => ({
          averageRating: Number(resp?.averageRating || 0),
          totalRatings: Number(resp?.totalRatings || 0)
        }))
      );
  }

  private parseProductImages(product: Product): Product {
    // Parse images JSON string to array
    if (product.images && typeof product.images === 'string') {
      try {
        product.images = JSON.parse(product.images);
      } catch (e) {
        console.warn('Failed to parse images JSON:', product.images);
        product.images = [];
      }
    } else if (!product.images) {
      product.images = [];
    }

    // Parse variants JSON string to array
    if (product.variants && typeof product.variants === 'string') {
      try {
        product.variants = JSON.parse(product.variants);
      } catch (e) {
        console.warn('Failed to parse variants JSON:', product.variants, e);
        product.variants = [];
      }
    } else if (!product.variants) {
      product.variants = [];
    }

    return product;
  }
}