import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Product, ProductFilters } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { ProductListComponent } from '../../components/product-list/product-list.component';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ProductListComponent],
  template: `
    <div class="products-page">
      <div class="container">
        <!-- Filters -->
        <div class="filters">
          <select [(ngModel)]="filters.category" (change)="onFilterChange()" class="filter-select">
            <option value="">All Categories</option>
            <option value="Backplate">Backplate</option>
            <option value="Brake Shoe">Brake Shoe</option>
            <option value="Bushing">Bushing</option>
            <option value="Center Spring">Center Spring</option>
            <option value="Clutch Bell">Clutch Bell</option>
            <option value="Clutch Lining Assembly">Clutch Lining Assembly</option>
            <option value="Clutch Shoe">Clutch Shoe</option>
            <option value="Clutch Spring">Clutch Spring</option>
            <option value="CVT Set">CVT Set</option>
            <option value="Drive Face">Drive Face</option>
            <option value="Engine Oil">Engine Oil</option>
            <option value="Exhaust Pipe">Exhaust Pipe</option>
            <option value="Flyball">Flyball</option>
            <option value="Gear Oil">Gear Oil</option>
            <option value="Pulley Set">Pulley Set</option>
            <option value="Slider">Slider</option>
            <option value="Torque Drive">Torque Drive</option>
          </select>
          
          <select [(ngModel)]="filters.brand" (change)="onFilterChange()" class="filter-select">
            <option value="">All Brands</option>
            <option value="Yamaha">Yamaha</option>
            <option value="Honda">Honda</option>
          </select>
          
          <select [(ngModel)]="sortBy" (change)="onSortChange()" class="filter-select">
            <option value="name">Sort by Name</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        <!-- Products Grid -->
        <app-product-list
          *ngIf="!loading && products.length > 0"
          [products]="products"
          [loading]="loading"
        ></app-product-list>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="!loading && products.length === 0">
          <h3>No Products Found</h3>
          <p>Try adjusting your filters or search terms.</p>
        </div>

        <!-- Loading State -->
        <div class="loading-state" *ngIf="loading">
          <p>Loading products...</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .products-page {
      min-height: 100vh;
      background: linear-gradient(145deg, #0f0f0f 0%, #1a1a1a 100%);
      color: white;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }


    .filters {
      display: flex;
      gap: 15px;
      margin-bottom: 30px;
      flex-wrap: wrap;
    }

    .filter-select {
      padding: 10px 15px;
      border: 1px solid #333;
      border-radius: 5px;
      background: #2a2a2a;
      color: white;
      font-size: 14px;
      min-width: 150px;
    }


    .empty-state {
      text-align: center;
      padding: 50px;
      color: #666;
    }

    .load-mock-btn {
      background: #ff8c00;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      margin-top: 15px;
    }

    .load-mock-btn:hover {
      background: #e67e00;
    }

    .loading-state {
      text-align: center;
      padding: 50px;
      color: #666;
    }

    @media (max-width: 768px) {
      .filters {
        flex-direction: column;
      }
      
      .filter-select {
        width: 100%;
      }
    }
  `]
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  brands: string[] = [];
  categories: string[] = [];
  loading = false;
  inStockOnly = false;
  sortBy = 'name';

  filters: ProductFilters = {
    search: '',
    brand: '',
    category: '',
    minPrice: undefined,
    maxPrice: undefined,
    minStock: undefined
  };

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private route: ActivatedRoute,
    private router: Router,
    private title: Title
  ) {}

  ngOnInit(): void {
    // Set page title
    this.title.setTitle('Products - Sun Racing Spirit Philippines');
    
    this.loadProducts();
    this.loadBrands();
    this.loadCategories();
    
    // Handle search query from navbar
    this.route.queryParams.subscribe(params => {
      if (params['search']) {
        this.filters.search = params['search'];
      } else {
        // Clear search when no search parameter
        this.filters.search = '';
      }
      this.onFilterChange();
    });
  }

  loadProducts(): void {
    this.loading = true;
    this.productService.searchProducts(this.filters).subscribe({
      next: (products) => {
        // Only show published products and apply sorting
        this.products = this.sortProducts(products.filter(product => product.isPublished));
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.products = [];
        this.loading = false;
      }
    });
  }

  loadBrands(): void {
    this.productService.getBrands().subscribe(brands => {
      this.brands = brands;
    });
  }

  loadCategories(): void {
    this.productService.getCategories().subscribe(categories => {
      this.categories = categories;
    });
  }

  onFilterChange(): void {
    this.loadProducts();
  }

  onStockFilterChange(): void {
    this.filters.minStock = this.inStockOnly ? 1 : undefined;
    this.onFilterChange();
  }

  onSortChange(): void {
    this.products = this.sortProducts(this.products);
  }

  sortProducts(products: Product[]): Product[] {
    const sorted = [...products];
    switch (this.sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'price-low':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price-high':
        return sorted.sort((a, b) => b.price - a.price);
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      default:
        return sorted;
    }
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      brand: '',
      category: '',
      minPrice: undefined,
      maxPrice: undefined,
      minStock: undefined
    };
    this.inStockOnly = false;
    this.loadProducts();
  }

  onQuickView(product: Product): void {
    // Implement quick view modal
  }


}
