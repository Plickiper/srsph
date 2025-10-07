import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Product, ProductFilters } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = 'http://localhost:8080/api/products';
  private productsSubject = new BehaviorSubject<Product[]>([]);
  public products$ = this.productsSubject.asObservable();

  // Empty mock products array - will be populated from backend
  private mockProducts: Product[] = [];

  constructor(private http: HttpClient) {
    this.loadProductsFromBackend();
  }

  // Get all products
  getProducts(): Observable<Product[]> {
    return this.http.get<{success: boolean, products: Product[]}>(this.apiUrl)
      .pipe(
        map(response => this.transformProducts(response.products || [])),
        catchError(error => {
          console.error('Error fetching products:', error);
          return of(this.mockProducts); // Fallback to mock data
        })
      );
  }

  // Get product by ID
  getProductById(id: number): Observable<Product> {
    return this.http.get<{success: boolean, product: Product}>(`${this.apiUrl}/${id}`)
      .pipe(
        map(response => this.transformProduct(response.product)),
        catchError(error => {
          console.error('Error fetching product:', error);
          const product = this.mockProducts.find(p => p.id === id);
          if (product) {
            return of(product);
          }
          throw new Error('Product not found');
        })
      );
  }

  // Search products with filters
  searchProducts(filters: ProductFilters): Observable<Product[]> {
    let params = new HttpParams();
    
    if (filters.search) {
      params = params.set('search', filters.search);
    }
    if (filters.brand) {
      params = params.set('brand', filters.brand);
    }
    if (filters.category) {
      params = params.set('category', filters.category);
    }
    if (filters.minPrice) {
      params = params.set('minPrice', filters.minPrice.toString());
    }
    if (filters.maxPrice) {
      params = params.set('maxPrice', filters.maxPrice.toString());
    }
    if (filters.minStock) {
      params = params.set('minStock', filters.minStock.toString());
    }

    return this.http.get<{success: boolean, products: Product[]}>(`${this.apiUrl}/search`, { params })
      .pipe(
        map(response => this.transformProducts(response.products || [])),
        catchError(error => {
          console.error('Error searching products:', error);
          // Fallback to local filtering with mock data
          let filteredProducts = [...this.mockProducts];

          if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filteredProducts = filteredProducts.filter(product =>
              product.name.toLowerCase().includes(searchTerm) ||
              product.description.toLowerCase().includes(searchTerm) ||
              product.brand.toLowerCase().includes(searchTerm)
            );
          }

          if (filters.brand) {
            filteredProducts = filteredProducts.filter(product =>
              product.brand.toLowerCase() === filters.brand!.toLowerCase()
            );
          }

          if (filters.category) {
            filteredProducts = filteredProducts.filter(product =>
              product.category.toLowerCase() === filters.category!.toLowerCase()
            );
          }

          if (filters.minPrice) {
            filteredProducts = filteredProducts.filter(product =>
              product.price >= filters.minPrice!
            );
          }

          if (filters.maxPrice) {
            filteredProducts = filteredProducts.filter(product =>
              product.price <= filters.maxPrice!
            );
          }

          if (filters.minStock) {
            filteredProducts = filteredProducts.filter(product =>
              product.stockQuantity >= filters.minStock!
            );
          }

          return of(filteredProducts);
        })
      );
  }

  // Get products by brand
  getProductsByBrand(brand: string): Observable<Product[]> {
    const products = this.mockProducts.filter(p => p.brand.toLowerCase() === brand.toLowerCase());
    return of(products);
  }

  // Get products by category
  getProductsByCategory(category: string): Observable<Product[]> {
    const products = this.mockProducts.filter(p => p.category.toLowerCase() === category.toLowerCase());
    return of(products);
  }

  // Get all brands
  getBrands(): Observable<string[]> {
    return this.http.get<{success: boolean, brands: string[]}>(`${this.apiUrl}/brands`)
      .pipe(
        map(response => response.brands || []),
        catchError(error => {
          console.error('Error fetching brands:', error);
          const brands = [...new Set(this.mockProducts.map(p => p.brand))];
          return of(brands);
        })
      );
  }

  // Get all categories
  getCategories(): Observable<string[]> {
    return this.http.get<{success: boolean, categories: string[]}>(`${this.apiUrl}/categories`)
      .pipe(
        map(response => response.categories || []),
        catchError(error => {
          console.error('Error fetching categories:', error);
          const categories = [...new Set(this.mockProducts.map(p => p.category))];
          return of(categories);
        })
      );
  }

  // Load products from backend and update subject
  private loadProductsFromBackend(): void {
    this.http.get<{success: boolean, products: Product[]}>(this.apiUrl)
      .pipe(
        map(response => this.transformProducts(response.products || [])),
        catchError(error => {
          console.error('Error loading products from backend:', error);
          return of(this.mockProducts); // Fallback to empty mock data
        })
      )
      .subscribe(products => {
        this.productsSubject.next(products);
      });
  }

  // Get featured products (limited to 5)
  getFeaturedProducts(): Observable<Product[]> {
    return this.http.get<{success: boolean, products: Product[]}>(`${this.apiUrl}/featured`)
      .pipe(
        map(response => this.transformProducts(response.products || [])),
        catchError(error => {
          console.error('Error loading featured products:', error);
          return of([]);
        })
      );
  }

  // Get new arrivals (limited to 5, FIFO)
  getNewArrivals(): Observable<Product[]> {
    return this.http.get<{success: boolean, products: Product[]}>(`${this.apiUrl}/new-arrivals`)
      .pipe(
        map(response => this.transformProducts(response.products || [])),
        catchError(error => {
          console.error('Error loading new arrivals:', error);
          return of([]);
        })
      );
  }

  // Set featured product status
  setFeaturedProduct(productId: number, isFeatured: boolean): Observable<Product> {
    return this.http.post<{success: boolean, product: Product}>(`${this.apiUrl}/${productId}/featured`, {
      isFeatured: isFeatured
    }).pipe(
      map(response => this.transformProduct(response.product)),
      catchError(error => {
        console.error('Error setting featured product:', error);
        throw error;
      })
    );
  }

  // Load mock products and update subject
  private loadMockProducts(): void {
    this.productsSubject.next(this.mockProducts);
  }


  // Transform products to parse images JSON string
  private transformProducts(products: Product[]): Product[] {
    return products.map(product => this.transformProduct(product));
  }

  // Transform single product to parse images and variants JSON strings
  private transformProduct(product: Product): Product {
    // Parse images JSON string
    if (product.images && typeof product.images === 'string') {
      try {
        product.images = JSON.parse(product.images);
      } catch (error) {
        console.error('Error parsing images JSON:', error);
        product.images = [];
      }
    }

    // Parse variants JSON string
    if (product.variants && typeof product.variants === 'string') {
      try {
        product.variants = JSON.parse(product.variants);
      } catch (error) {
        console.error('Error parsing variants JSON:', error);
        product.variants = [];
      }
    }

    return product;
  }

}
