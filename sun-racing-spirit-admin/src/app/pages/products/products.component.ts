import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminProductService, Product } from '../../services/admin-product.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="header-content">
        <h1>Products</h1>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="goToAddProduct()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"></path>
          </svg>
          Add New Product
          </button>
        </div>
      </div>

      <!-- Filters and Search -->
      <div class="filters-section">
        <div class="search-bar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="M21 21l-4.35-4.35"></path>
          </svg>
          <input 
            type="text" 
            placeholder="Search products by name, SKU, or category..."
            [(ngModel)]="searchTerm"
            (input)="onSearch()"
            class="search-input"
          >
        </div>
        
        <div class="filter-controls">
          <select [(ngModel)]="selectedCategory" (change)="onFilterChange()" class="filter-select">
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
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading products...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage && !loading" class="error-container">
        <div class="error-icon">⚠️</div>
        <h3>Unable to Load Products</h3>
        <p>{{ errorMessage }}</p>
        <button class="btn btn-primary" (click)="loadProducts()">Try Again</button>
      </div>

      <!-- Products Table -->
      <div *ngIf="!loading && !errorMessage" class="products-table-container">
        <div class="table-header">
          <div class="table-info">
            <span class="product-count">{{ filteredProducts.length }} products</span>
            <span class="table-subtitle">Sun Racing Spirit inventory</span>
          </div>
          <div class="table-actions">
            <button class="btn btn-primary btn-sm" (click)="openInventoryModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 1v6l3-3 3 3V1"></path>
              </svg>
              Inventory
            </button>
            <button class="btn btn-secondary btn-sm" (click)="refreshProducts()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-5.88-5.88L17 10"></path>
              </svg>
              Refresh
            </button>
          </div>
        </div>

        <!-- Desktop Table View -->
        <div class="table-wrapper desktop-view">
          <table class="products-table">
            <thead>
              <tr>
                <th class="product-info">Product</th>
                <th class="category">Category</th>
                <th class="sku">SKU</th>
                <th class="published">Published</th>
                <th class="featured">Featured</th>
                <th class="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let product of filteredProducts" class="product-row">
                <td class="product-info">
                  <div class="product-details">
                    <div class="product-image">
                      <img *ngIf="product.imageUrl" [src]="product.imageUrl" [alt]="product.name" class="product-img" (error)="onImageError($event, product)" (load)="onImageLoad($event, product)">
                      <div *ngIf="!product.imageUrl" class="product-img-placeholder">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21,15 16,10 5,21"></polyline>
                        </svg>
                      </div>
                    </div>
                    <div class="product-info-text">
                      <div class="product-name">{{ product.name }}</div>
                      <div class="product-brand">{{ product.brand }}</div>
                    </div>
                  </div>
                </td>
                <td class="category">
                  <span class="category-badge">{{ product.category }}</span>
                </td>
                <td class="sku">
                  <span class="sku-text">{{ product.partNumber }}</span>
                </td>
                <td class="published">
                  <span class="status-badge" 
                        [class.published]="product.isPublished" 
                        [class.unpublished]="!product.isPublished">
                    {{ product.isPublished ? 'Published' : 'Unpublished' }}
                  </span>
                </td>
                <td class="featured">
                  <span class="status-badge" 
                        [class.featured]="product.isFeatured" 
                        [class.not-featured]="!product.isFeatured">
                    {{ product.isFeatured ? 'Featured' : 'Regular' }}
                  </span>
                </td>
                <td class="actions">
                  <div class="action-buttons">
                    <button class="btn-action btn-edit" (click)="editProduct(product)" title="Edit Product" (mousedown)="onButtonMouseDown($event)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Card View -->
        <div class="mobile-view">
          <div class="products-grid">
            <div *ngFor="let product of filteredProducts" class="product-card">
              <div class="card-header">
                <div class="product-image">
                  <img *ngIf="product.imageUrl" [src]="product.imageUrl" [alt]="product.name" class="product-img" (error)="onImageError($event, product)" (load)="onImageLoad($event, product)">
                  <div *ngIf="!product.imageUrl" class="product-img-placeholder">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21,15 16,10 5,21"></polyline>
                    </svg>
                  </div>
                </div>
                <div class="product-info">
                  <h3 class="product-name">{{ product.name }}</h3>
                  <p class="product-brand">{{ product.brand }}</p>
                  <div class="product-meta">
                    <span class="category-badge">{{ product.category }}</span>
                  </div>
                  <div class="sku-section">
                    <span class="sku-label">SKU:</span>
                    <span class="sku-text">{{ product.partNumber }}</span>
                  </div>
                </div>
              </div>
              
              <div class="card-body">
                <div class="status-row">
                  <div class="status-item">
                    <span class="status-label">Status:</span>
                    <span class="status-badge" 
                          [class.published]="product.isPublished" 
                          [class.unpublished]="!product.isPublished">
                      {{ product.isPublished ? 'Published' : 'Unpublished' }}
                    </span>
                  </div>
                  <div class="status-item">
                    <span class="status-label">Featured:</span>
                    <span class="status-badge" 
                          [class.featured]="product.isFeatured" 
                          [class.not-featured]="!product.isFeatured">
                      {{ product.isFeatured ? 'Yes' : 'No' }}
                    </span>
                  </div>
                </div>
              </div>
              
              <div class="card-actions">
                <button class="btn btn-primary btn-sm" (click)="editProduct(product)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  Edit
                </button>
              </div>
            </div>
          </div>
          
          <div *ngIf="filteredProducts.length === 0" class="empty-state">
            <div class="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 1v6l3-3 3 3V1"></path>
              </svg>
      </div>
            <h3>No products found</h3>
            <p>Start building your inventory by adding your first product.</p>
            <button class="btn btn-primary" (click)="goToAddProduct()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"></path>
              </svg>
              Add Your First Product
            </button>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div *ngIf="errorMessage" class="error-container">
        <div class="error-icon">⚠️</div>
        <p>{{ errorMessage }}</p>
      </div>

      <!-- Inventory Modal -->
      <div *ngIf="showInventoryModal" class="modal-overlay" (click)="closeInventoryModal()">
        <div class="inventory-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Product Inventory</h2>
            <button class="close-btn" (click)="closeInventoryModal()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div class="modal-content">
            <div class="inventory-summary">
              <div class="summary-stats">
                <div class="summary-item">
                  <span class="summary-label">Total Products:</span>
                  <span class="summary-value">{{ products.length }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Low Stock Items:</span>
                  <span class="summary-value low-stock-count">{{ getLowStockCount() }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Out of Stock:</span>
                  <span class="summary-value out-of-stock-count">{{ getOutOfStockCount() }}</span>
                </div>
              </div>
              <div class="filter-toggles">
                <button class="filter-toggle" 
                        [class.active]="showLowStock" 
                        (click)="toggleLowStockFilter()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 3h18l-6 6v9l-6-6V3z"></path>
                  </svg>
                  Low Stock
                </button>
                <button class="filter-toggle" 
                        [class.active]="showOutOfStock" 
                        (click)="toggleOutOfStockFilter()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                  Out of Stock
                </button>
                <button class="filter-toggle" 
                        [class.active]="showAll" 
                        (click)="showAllProducts()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4"></path>
                    <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
                    <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
                    <path d="M3 12h6"></path>
                    <path d="M15 12h6"></path>
                  </svg>
                  All Products
                </button>
              </div>
            </div>

            <div class="inventory-controls">
              <div class="inventory-info">
                <span class="showing-text">Showing {{ getFilteredProducts().length }} of {{ products.length }} products</span>
              </div>
            </div>

            <div class="inventory-list">
              <div *ngFor="let product of getFilteredProducts(); let i = index" class="product-inventory-item" [class.collapsed]="isProductCollapsed(i)">
                <div class="product-header" (click)="toggleProductCollapse(i)">
                  <div class="product-info">
                    <div class="product-image">
                      <img *ngIf="product.imageUrl" [src]="product.imageUrl" [alt]="product.name" class="product-img">
                      <div *ngIf="!product.imageUrl" class="product-img-placeholder">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21,15 16,10 5,21"></polyline>
                        </svg>
                      </div>
                    </div>
                    <div class="product-details">
                      <h3 class="product-name">{{ product.name }}</h3>
                      <div class="product-meta">
                        <span class="product-category">{{ product.category }}</span>
                        <span class="product-sku">{{ product.partNumber }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="product-actions">
                    <!-- Stock Status Indicators -->
                    <div class="stock-status-indicators">
                      <div *ngFor="let status of getProductStockStatuses(product)" 
                           class="stock-status-indicator" 
                           [class.out-of-stock]="status === 'out-of-stock'"
                           [class.low-stock]="status === 'low-stock'"
                           [class.in-stock]="status === 'in-stock'"
                           [title]="getStatusText(status)">
                        <div class="stock-dot"></div>
                        <span class="stock-text">{{ getStatusText(status) }}</span>
                      </div>
                    </div>
                    
                    <button class="collapse-icon" [class.rotated]="!isProductCollapsed(i)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6,9 12,15 18,9"></polyline>
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Variants Section -->
                <div class="variants-section" *ngIf="hasVariants(product)">
                  <div class="variants-header">
                    <h4>Variants & Stock</h4>
                    <button class="btn btn-primary btn-sm" (click)="editProduct(product)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      Edit Product
                    </button>
                  </div>
                  <div class="variants-list">
                    <div *ngFor="let variant of getProductVariants(product)" class="variant-item">
                      <div class="variant-info">
                        <span class="variant-model">{{ variant.model }}</span>
                      </div>
                      <div class="variant-details">
                        <div class="variant-price">
                          <span class="price-label">Price:</span>
                          <span class="price-value">₱{{ variant.price | number:'1.2-2' }}</span>
                        </div>
                        <div class="variant-stock">
                          <span class="stock-label">Stock:</span>
                          <span class="stock-value" 
                                [class.low-stock]="variant.stockQuantity > 0 && variant.stockQuantity <= 10"
                                [class.out-of-stock]="variant.stockQuantity === 0">
                            {{ variant.stockQuantity }}
                          </span>
                          <div class="stock-indicator" 
                               [class.low-stock]="variant.stockQuantity > 0 && variant.stockQuantity <= 10"
                               [class.out-of-stock]="variant.stockQuantity === 0"
                               [class.in-stock]="variant.stockQuantity > 10"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Single Product (No Variants) -->
                <div class="single-product-section" *ngIf="!hasVariants(product)">
                  <div class="single-product-header">
                    <h4>Product Details</h4>
                    <button class="btn btn-primary btn-sm" (click)="editProduct(product)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      Edit Product
                    </button>
                  </div>
                  <div class="single-product-details">
                    <div class="single-price">
                      <span class="price-label">Price:</span>
                      <span class="price-value">₱{{ product.price | number:'1.2-2' }}</span>
                    </div>
                    <div class="single-stock">
                      <span class="stock-label">Stock:</span>
                      <span class="stock-value" 
                            [class.low-stock]="product.stockQuantity > 0 && product.stockQuantity <= 10"
                            [class.out-of-stock]="product.stockQuantity === 0">
                        {{ product.stockQuantity }}
                      </span>
                      <div class="stock-indicator" 
                           [class.low-stock]="product.stockQuantity > 0 && product.stockQuantity <= 10"
                           [class.out-of-stock]="product.stockQuantity === 0"
                           [class.in-stock]="product.stockQuantity > 10"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 40px;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      flex-wrap: wrap;
      gap: 20px;
    }
    
    .header-content h1 {
      font-size: 2.5rem;
      color: white;
      margin: 0 0 8px 0;
    }
    
    .header-content p {
      color: rgba(255, 255, 255, 0.7);
      margin: 0;
    }
    
    .header-actions {
      display: flex;
      gap: 12px;
    }
    
    /* Loading and Error States */
    .loading-container, .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      text-align: center;
    }
    
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 140, 0, 0.3);
      border-radius: 50%;
      border-top-color: #ff8c00;
      animation: spin 1s ease-in-out infinite;
      margin-bottom: 20px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .loading-container p {
      color: rgba(255, 255, 255, 0.7);
      font-size: 1.1rem;
    }
    
    .error-container {
      background: rgba(239, 68, 68, 0.05);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 16px;
      margin-bottom: 40px;
    }
    
    .error-icon {
      font-size: 3rem;
      margin-bottom: 20px;
    }
    
    .error-container h3 {
      color: #ef4444;
      margin-bottom: 12px;
      font-size: 1.5rem;
    }
    
    .error-container p {
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 24px;
      max-width: 400px;
    }
    
    .filters-section {
      display: flex;
      gap: 20px;
      margin-bottom: 24px;
      flex-wrap: wrap;
      align-items: center;
    }
    
    .search-bar {
      position: relative;
      flex: 1;
      min-width: 300px;
    }
    
    .search-bar svg {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: rgba(255, 255, 255, 0.5);
    }
    
    .search-input {
      width: 100%;
      padding: 12px 16px 12px 48px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: white;
      font-size: 0.9rem;
    }
    
    .search-input:focus {
      outline: none;
      border-color: #ff8c00;
      box-shadow: 0 0 0 3px rgba(255, 140, 0, 0.2);
    }
    
    .search-input::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }
    
    .filter-controls {
      display: flex;
      gap: 12px;
    }
    
    .filter-select {
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.05) !important;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: white !important;
      font-size: 0.9rem;
      min-width: 150px;
    }
    
    .filter-select option {
      background: #1a1a1a !important;
      color: white !important;
      padding: 8px 12px;
    }
    
    .filter-select:focus {
      outline: none;
      border-color: #ff8c00;
    }
    
    .products-table-container {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      overflow: hidden;
    }
    
    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .table-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .product-count {
      color: white;
      font-weight: 600;
      font-size: 1.1rem;
    }
    
    .table-subtitle {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.9rem;
    }
    
    .table-actions {
      display: flex;
      gap: 12px;
    }
    
    .table-wrapper {
      overflow-x: auto;
      width: 100%;
      display: block;
    }
    
    .products-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: auto;
      min-width: 800px;
      display: table;
    }
    
    .products-table th {
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.8);
      font-weight: 600;
      font-size: 0.9rem;
      text-align: left;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .products-table th.product-info {
      width: auto;
      min-width: 200px;
    }
    
    .products-table th.category {
      width: auto;
      min-width: 100px;
    }
    
    .products-table th.sku {
      width: auto;
      min-width: 120px;
    }
    
    .products-table th.published {
      width: auto;
      min-width: 80px;
    }
    
    .products-table th.featured {
      width: auto;
      min-width: 80px;
    }
    
    .products-table th.actions {
      width: auto;
      min-width: 80px;
    }
    
    .products-table td {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      vertical-align: middle;
    }
    
    .products-table td.product-info {
      width: auto;
      min-width: 200px;
    }
    
    .products-table td.category {
      width: auto;
      min-width: 100px;
    }
    
    .products-table td.sku {
      width: auto;
      min-width: 120px;
    }
    
    .products-table td.published {
      width: auto;
      min-width: 80px;
    }
    
    .products-table td.featured {
      width: auto;
      min-width: 80px;
    }
    
    .products-table td.actions {
      width: auto;
      min-width: 80px;
    }
    
    .product-row:hover {
      background: rgba(255, 255, 255, 0.02);
    }
    
    .product-row:hover .btn-action {
      opacity: 1;
      visibility: visible;
    }
    
    .products-table .product-details {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-direction: row;
    }
    
    .product-image {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
      flex-grow: 0;
    }
    
    .product-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .product-img-placeholder {
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.5);
    }
    
    .product-info-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }
    
    .product-name {
      color: white;
      font-weight: 500;
      font-size: 0.95rem;
    }
    
    .product-brand {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.85rem;
    }
    
    .category-badge {
      background: rgba(255, 140, 0, 0.2);
      color: #ff8c00;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    
    .sku-text {
      color: rgba(255, 255, 255, 0.8);
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
    }
    
    
    .status-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    
    .status-badge.published {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }
    
    .status-badge.unpublished {
      background: rgba(156, 163, 175, 0.2);
      color: #9ca3af;
    }
    
    .status-badge.featured {
      background: rgba(255, 140, 0, 0.2);
      color: #ff8c00;
    }
    
    .status-badge.not-featured {
      background: rgba(156, 163, 175, 0.2);
      color: #9ca3af;
    }
    
    .action-buttons {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: center;
    }
    
    .actions {
      text-align: center;
      width: 80px;
    }
    
    .btn-action {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      z-index: 10;
      pointer-events: auto;
      opacity: 1;
      visibility: visible;
    }
    
    .btn-edit {
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    
    .btn-edit:hover {
      background: rgba(59, 130, 246, 0.3);
      border-color: rgba(59, 130, 246, 0.5);
      transform: scale(1.05);
    }
    
    .btn-edit:active {
      transform: scale(0.95);
    }
    
    .btn-delete {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
    
    .btn-delete:hover {
      background: rgba(239, 68, 68, 0.3);
    }
    
    
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: rgba(255, 255, 255, 0.6);
    }
    
    .empty-icon {
      margin-bottom: 20px;
      color: rgba(255, 255, 255, 0.3);
    }
    
    .empty-state h3 {
      color: white;
      margin: 0 0 8px 0;
      font-size: 1.2rem;
    }
    
    .empty-state p {
      margin: 0 0 24px 0;
    }
    
    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #ff8c00, #ffb347);
      color: white;
    }
    
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(255, 140, 0, 0.3);
    }
    
    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }
    
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .collapse-icon {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s ease;
      flex-shrink: 0;
      align-self: flex-start;
      margin-top: 4px; /* Align with product name */
    }

    .collapse-icon:hover {
      color: white;
      background: rgba(255, 255, 255, 0.1);
    }

    .collapse-icon.rotated {
      transform: rotate(180deg);
    }

    /* Stock Status Indicators */
    .stock-indicators {
      display: flex;
      gap: 8px;
      margin-right: 12px;
      flex-shrink: 0;
      align-items: flex-start;
      padding-top: 4px; /* Align with product name */
    }

    .stock-indicator-badge {
      display: flex;
      align-items: center;
      padding: 3px 6px;
      border-radius: 8px;
      font-size: 0.7rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.025em;
      white-space: nowrap;
    }

    .stock-indicator-badge.low-stock {
      background: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .stock-indicator-badge.out-of-stock {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    
    .btn-sm {
      padding: 8px 16px;
      font-size: 0.85rem;
    }
    
    .error-container {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 20px;
    }
    
    .error-container p {
      margin: 0;
      color: #ef4444;
    }
    
    .error-icon {
      font-size: 1.2rem;
    }

    /* Inventory Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .inventory-modal {
      background: #1a1a1a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      width: 100%;
      max-width: 1000px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 32px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .modal-header h2 {
      color: white;
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .filter-toggles {
      display: flex;
      gap: 8px;
    }

    .filter-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .filter-toggle:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .filter-toggle.active {
      background: rgba(255, 140, 0, 0.2);
      border-color: rgba(255, 140, 0, 0.4);
      color: #ff8c00;
    }

    .filter-toggle.active:hover {
      background: rgba(255, 140, 0, 0.3);
    }

    .inventory-controls {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 16px 32px;
      background: rgba(255, 255, 255, 0.01);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .inventory-info {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.9rem;
    }

    .close-btn {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      transition: all 0.2s ease;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .modal-content {
      flex: 1;
      overflow-y: auto;
      padding: 0;
    }

    .inventory-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 32px;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .summary-stats {
      display: flex;
      gap: 32px;
    }

    .summary-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .summary-label {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.9rem;
    }

    .summary-value {
      color: white;
      font-size: 1.2rem;
      font-weight: 600;
    }

    .low-stock-count {
      color: #f59e0b;
    }

    .out-of-stock-count {
      color: #ef4444;
    }

    .inventory-list {
      padding: 24px 32px;
    }

    .product-inventory-item {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      margin-bottom: 20px;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .product-inventory-item.collapsed .variants-section,
    .product-inventory-item.collapsed .single-product-section {
      display: none;
    }

    .product-header {
      display: flex;
      align-items: flex-start;
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      cursor: pointer;
      transition: background-color 0.2s ease;
      gap: 16px; /* Add gap between sections */
    }

    .product-header:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .product-info {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1; /* Take up available space */
      min-width: 0; /* Allow shrinking */
    }

    .product-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    .stock-status-indicators {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }

    .stock-status-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: all 0.2s ease;
    }

    .stock-status-indicator.out-of-stock {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .stock-status-indicator.low-stock {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .stock-status-indicator.in-stock {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .stock-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .stock-status-indicator.out-of-stock .stock-dot {
      background: #ef4444;
    }

    .stock-status-indicator.low-stock .stock-dot {
      background: #f59e0b;
    }

    .stock-status-indicator.in-stock .stock-dot {
      background: #22c55e;
    }

    .stock-text {
      white-space: nowrap;
    }

    .product-image {
      width: 60px;
      height: 60px;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
    }

    .product-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .product-img-placeholder {
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.5);
    }

    .product-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .product-details h3 {
      color: white;
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .product-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      justify-content: flex-start;
    }

    .product-category {
      background: rgba(255, 140, 0, 0.2);
      color: #ff8c00;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
      display: inline-block;
    }

    .product-sku {
      color: rgba(255, 255, 255, 0.6);
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      margin: 0;
    }

    .variants-section {
      padding: 20px 24px;
    }

    .variants-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .variants-header h4 {
      color: white;
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .variants-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .variant-item {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 20px;
      align-items: center;
      padding: 16px 20px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
    }

    .variant-info {
      min-width: 0;
    }

    .variant-model {
      color: white;
      font-weight: 500;
      font-size: 0.95rem;
      word-wrap: break-word;
    }

    .variant-details {
      display: flex;
      gap: 24px;
      align-items: center;
      flex-shrink: 0;
      min-width: 300px; /* Ensure consistent width */
    }

    .variant-price,
    .variant-stock,
    .single-price,
    .single-stock {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 20px; /* Ensure consistent height */
      min-width: 120px; /* Ensure consistent width */
    }

    .price-label,
    .stock-label {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.85rem;
      min-width: 50px; /* Ensure consistent label width */
      text-align: left;
    }

    .price-value {
      color: white;
      font-weight: 600;
      font-size: 0.95rem;
      min-width: 80px; /* Ensure consistent value width */
      text-align: left;
    }

    .stock-value {
      color: white;
      font-weight: 500;
      font-size: 0.95rem;
      line-height: 1.2; /* Consistent line height */
      min-width: 30px; /* Ensure consistent value width */
      text-align: left;
    }

    .stock-value.low-stock {
      color: #f59e0b;
    }

    .stock-value.out-of-stock {
      color: #ef4444;
    }

    .stock-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #22c55e;
      flex-shrink: 0; /* Prevent shrinking */
      margin-top: 1px; /* Fine-tune vertical alignment */
    }

    .stock-indicator.low-stock {
      background: #f59e0b;
    }

    .stock-indicator.out-of-stock {
      background: #ef4444;
    }

    .single-product-section {
      padding: 20px 24px;
      background: rgba(255, 255, 255, 0.02);
    }

    .single-product-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .single-product-header h4 {
      color: white;
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .single-product-details {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 32px;
      align-items: center;
    }

    /* Mobile Responsive for Modal */
    @media (max-width: 768px) {
      .inventory-modal {
        margin: 10px;
        max-height: 95vh;
      }

      .modal-header {
        padding: 16px 20px;
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .modal-header h2 {
        font-size: 1.25rem;
      }

      .header-actions {
        width: 100%;
        justify-content: space-between;
      }

      .filter-toggles {
        flex-wrap: wrap;
        gap: 6px;
      }

      .filter-toggle {
        padding: 6px 10px;
        font-size: 0.8rem;
      }

      .inventory-summary {
        flex-direction: column;
        gap: 16px;
        padding: 16px 20px;
      }

      .summary-stats {
        flex-direction: column;
        gap: 12px;
      }

      .inventory-controls {
        padding: 12px 20px;
      }

      .inventory-list {
        padding: 16px 20px;
      }

      .product-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
        padding: 16px 20px;
      }

      .product-info {
        width: 100%;
      }

      .product-actions {
        width: 100%;
        justify-content: space-between;
        margin-top: 8px;
      }

      .stock-status-indicators {
        gap: 4px;
      }

      .stock-status-indicator {
        font-size: 0.7rem;
        padding: 3px 6px;
      }

      .stock-text {
        display: none; /* Hide text on mobile, show only dot */
      }

      .stock-indicators {
        margin-right: 8px;
        margin-bottom: 8px;
        flex-wrap: wrap;
      }

      .stock-indicator-badge {
        font-size: 0.65rem;
        padding: 2px 4px;
      }

      .product-meta {
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
        justify-content: flex-start;
      }

      .variant-item {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .variant-details {
        width: 100%;
        justify-content: space-between;
      }

      .single-product-details {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }
    }
    
    /* Mobile responsive styles */
    @media (max-width: 1024px) {
      .page-container {
        padding: 20px;
      }
      
      .page-header {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }
      
      .header-content h1 {
        font-size: 2rem;
      }
      
      .filters-section {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }
      
      .search-bar {
        min-width: auto;
      }
      
      .filter-controls {
        flex-direction: column;
        gap: 12px;
      }
      
      .filter-select {
        min-width: auto;
      }
    }
    
    @media (max-width: 600px) {
      .page-container {
        padding: 16px;
      }
      
      .header-content h1 {
        font-size: 1.75rem;
      }
      
      .table-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
        padding: 16px;
      }
      
      .products-table {
        font-size: 0.85rem;
      }
      
      .products-table th,
      .products-table td {
        padding: 12px 16px;
      }
      
      /* Hide less important columns on mobile */
      .products-table th.sku,
      .products-table td.sku {
        display: none;
      }
      
      .products-table .product-details {
        flex-direction: row;
        align-items: center;
        gap: 8px;
      }
      
      .product-image {
        width: 40px;
        height: 40px;
      }
      
      .product-name {
        font-size: 0.9rem;
      }
      
      .product-brand {
        font-size: 0.8rem;
      }
    }
    
    @media (max-width: 400px) {
      .page-container {
        padding: 12px;
      }
      
      .header-content h1 {
        font-size: 1.5rem;
      }
      
      .btn {
        padding: 10px 16px;
        font-size: 0.9rem;
      }
      
      .btn-sm {
        padding: 6px 12px;
        font-size: 0.8rem;
      }
      
      /* Keep product info horizontal even on very small screens */
      .products-table .product-details {
        flex-direction: row;
        align-items: center;
        gap: 6px;
      }
      
      .product-image {
        width: 32px;
        height: 32px;
      }
      
      .products-table th,
      .products-table td {
        padding: 8px 12px;
      }
      
      /* Hide more columns on very small screens */
      .products-table th.category,
      .products-table td.category {
        display: none;
      }
    }

    /* Mobile Card Layout Styles */
    .mobile-view {
      display: none;
    }

    .desktop-view {
      display: block;
    }

    @media (max-width: 768px) {
      .desktop-view {
        display: none;
      }

      .mobile-view {
        display: block;
      }

      .products-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
        padding: 0;
      }

      .product-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        overflow: hidden;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .product-card:hover {
        background: rgba(255, 255, 255, 0.05);
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      }

      .card-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .card-header .product-image {
        width: 60px;
        height: 60px;
        flex-shrink: 0;
        border-radius: 8px;
        overflow: hidden;
        background: #111;
        border: 1px solid #222;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .card-header .product-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .card-header .product-img-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255, 255, 255, 0.4);
      }

      .card-header .product-info {
        flex: 1;
        min-width: 0;
      }

      .card-header .product-name {
        font-size: 1rem;
        font-weight: 600;
        color: white;
        margin: 0 0 4px 0;
        line-height: 1.3;
        word-break: break-word;
      }

      .card-header .product-brand {
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.7);
        margin: 0 0 8px 0;
      }

      .card-header .product-meta {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 8px;
      }

      .card-header .category-badge {
        background: rgba(255, 140, 0, 0.2);
        color: #ff8c00;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 600;
        display: inline-block;
        width: fit-content;
      }

      .card-header .sku-section {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.05);
        padding: 6px 8px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .card-header .sku-label {
        color: rgba(255, 255, 255, 0.7);
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .card-header .sku-text {
        color: #ff8c00;
        font-size: 0.85rem;
        font-family: 'Courier New', monospace;
        font-weight: 600;
        letter-spacing: 0.5px;
      }

      .card-body {
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.02);
      }

      .status-row {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .status-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 0;
      }

      .status-label {
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.8rem;
        font-weight: 500;
      }

      .status-badge {
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .status-badge.published {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
      }

      .status-badge.unpublished {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      }

      .status-badge.featured {
        background: rgba(255, 140, 0, 0.2);
        color: #ff8c00;
      }

      .status-badge.not-featured {
        background: rgba(107, 114, 128, 0.2);
        color: #6b7280;
      }

      .card-actions {
        padding: 16px;
        display: flex;
        justify-content: center;
        background: rgba(255, 255, 255, 0.02);
        border-top: 1px solid rgba(255, 255, 255, 0.05);
      }

      .card-actions .btn {
        padding: 12px 24px;
        font-size: 0.9rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 44px; /* Touch-friendly height */
        border-radius: 8px;
        transition: all 0.2s ease;
        min-width: 120px;
      }

      .card-actions .btn-primary {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        border: none;
      }

      .card-actions .btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      }

      /* Mobile-specific improvements */
      .page-header {
        padding: 16px 0;
      }

      .header-content h1 {
        font-size: 1.5rem;
        margin-bottom: 8px;
      }

      .filters-section {
        margin-bottom: 20px;
      }

      .search-bar {
        margin-bottom: 12px;
      }

      .search-input {
        font-size: 16px; /* Prevents zoom on iOS */
        padding: 12px 16px;
      }

      .filter-select {
        font-size: 16px; /* Prevents zoom on iOS */
        padding: 12px 16px;
      }

      .table-header {
        padding: 16px;
        margin-bottom: 0;
      }

      .table-actions {
        flex-direction: column;
        gap: 8px;
        width: 100%;
      }

      .table-actions .btn {
        width: 100%;
        justify-content: center;
        min-height: 44px;
      }

      /* Empty state for mobile */
      .mobile-view .empty-state {
        text-align: center;
        padding: 40px 20px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        margin-top: 20px;
      }

      .mobile-view .empty-icon {
        margin-bottom: 16px;
        color: rgba(255, 255, 255, 0.4);
      }

      .mobile-view .empty-state h3 {
        color: white;
        font-size: 1.25rem;
        margin-bottom: 8px;
      }

      .mobile-view .empty-state p {
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 20px;
      }

      .mobile-view .empty-state .btn {
        min-height: 44px;
        padding: 12px 24px;
      }
    }

    /* Extra small screens */
    @media (max-width: 480px) {
      .page-container {
        padding: 12px;
      }

      .card-header {
        padding: 12px;
      }

      .card-header .product-image {
        width: 50px;
        height: 50px;
      }

      .card-header .product-name {
        font-size: 0.9rem;
      }

      .card-body {
        padding: 10px 12px;
      }

      .card-actions {
        padding: 12px;
        flex-direction: column;
      }

      .card-actions .btn {
        min-height: 48px;
        font-size: 0.9rem;
      }
    }
  `]
})
export class ProductsComponent implements OnInit, AfterViewInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  searchTerm = '';
  selectedCategory = '';
  errorMessage = '';
  showInventoryModal = false;
  loading = true;
  showLowStock = false;
  showOutOfStock = false;
  showAll = true;
  collapsedProducts: Set<number> = new Set();

  constructor(
    private productService: AdminProductService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    
    // Check if inventory modal should be opened
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('showInventory') === 'true') {
      const filterType = urlParams.get('filter');
      setTimeout(() => {
        this.openInventoryModal();
        // Apply filter if specified
        if (filterType) {
          this.applyFilterFromQuery(filterType);
        }
        // Ensure products are collapsed after modal opens and products are loaded
        setTimeout(() => {
          this.collapseAllProducts();
        }, 300);
      }, 100);
    }
  }

  ngAfterViewInit(): void {
    // Refresh products when returning from edit form
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.errorMessage = '';
    
    this.productService.getAllProducts().subscribe({
      next: (response: any) => {
        if (response.success && response.products) {
          this.products = response.products;
          this.filteredProducts = [...this.products];
          
          // If inventory modal is open, collapse all products
          if (this.showInventoryModal) {
            // Use setTimeout to ensure the filtered products are available
            setTimeout(() => {
              this.collapseAllProducts();
            }, 0);
          }
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading products:', error);
        this.errorMessage = 'Failed to load products. Please try again.';
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredProducts = this.products.filter(product => {
      const matchesSearch = !this.searchTerm || 
        product.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        product.partNumber.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesCategory = !this.selectedCategory || product.category === this.selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }

  refreshProducts(): void {
    this.loadProducts();
  }

  goToAddProduct(): void {
    this.router.navigate(['/products/new']);
  }

  editProduct(product: Product): void {
    if (product.id) {
      this.router.navigate(['/products/edit', product.id]);
    } else {
      console.error('Product ID is missing:', product);
      this.errorMessage = 'Cannot edit product: Missing product ID';
    }
  }

  onButtonMouseDown(event: Event): void {
    event.stopPropagation();
  }

  deleteProduct(product: Product): void {
    if (confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      this.productService.deleteProduct(product.id!).subscribe({
        next: () => {
          this.loadProducts();
        },
      error: (error: any) => {
        console.error('Error deleting product:', error);
        this.errorMessage = 'Failed to delete product. Please try again.';
      }
      });
    }
  }

  onImageLoad(event: any, product: any): void {
    // Show the image
    event.target.style.display = 'block';
  }

  onImageError(event: any, product: any): void {
    // If it's a blob URL that failed, convert to placeholder and update the product
    if (product.imageUrl && product.imageUrl.startsWith('blob:')) {
      product.imageUrl = this.getDefaultImageUrl(product);
      // Update the product in the backend
      this.updateProductImage(product);
    }
    // Hide the broken image and show placeholder
    event.target.style.display = 'none';
  }

  getDefaultImageUrl(product: any): string {
    const category = product.category || 'Product';
    const encodedCategory = encodeURIComponent(category);
    return `https://via.placeholder.com/400x400/1a1a1a/ffffff?text=${encodedCategory}`;
  }

  updateProductImage(product: any): void {
    this.productService.updateProduct(product.id, product).subscribe({
      next: (response: any) => {
        // Image updated successfully
      },
      error: (error: any) => {
        console.error('Error updating product image:', error);
      }
    });
  }

  // Inventory Modal Methods
  openInventoryModal(): void {
    this.showInventoryModal = true;
    // Collapse all products by default when opening inventory modal
    this.collapseAllProducts();
  }

  private collapseAllProducts(): void {
    this.collapsedProducts.clear();
    const filteredProducts = this.getFilteredProducts();
    filteredProducts.forEach((product, index) => {
      this.collapsedProducts.add(index);
    });
  }


  closeInventoryModal(): void {
    this.showInventoryModal = false;
    // Clear URL parameters when closing modal
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
  }

  hasVariants(product: Product): boolean {
    // Check if product has variants array
    if (product.variants) {
      if (typeof product.variants === 'string') {
        try {
          const parsed = JSON.parse(product.variants);
          return Array.isArray(parsed) && parsed.length > 0;
        } catch (e) {
          return false;
        }
      }
      return Array.isArray(product.variants) && product.variants.length > 0;
    }
    
    // Check if product has compatibility information (single variant)
    if (product.compatibility && product.compatibility.trim().length > 0) {
      return true;
    }
    
    return false;
  }

  getProductVariants(product: Product): any[] {
    // If product has variants array, return it
    if (product.variants) {
      if (typeof product.variants === 'string') {
        try {
          return JSON.parse(product.variants);
        } catch (e) {
          return [];
        }
      }
      return product.variants || [];
    }
    
    // If product has compatibility information but no variants array, create a single variant
    if (product.compatibility && product.compatibility.trim().length > 0) {
      return [{
        model: product.compatibility.trim(),
        price: product.price,
        stockQuantity: product.stockQuantity
      }];
    }
    
    return [];
  }

  getLowStockCount(): number {
    let count = 0;
    this.products.forEach(product => {
      if (this.hasVariants(product)) {
        const variants = this.getProductVariants(product);
        const hasLowStock = variants.some(variant => 
          variant.stockQuantity > 0 && variant.stockQuantity <= 10
        );
        if (hasLowStock) count++;
      } else {
        if (product.stockQuantity > 0 && product.stockQuantity <= 10) {
          count++;
        }
      }
    });
    return count;
  }

  getOutOfStockCount(): number {
    let count = 0;
    this.products.forEach(product => {
      if (this.hasVariants(product)) {
        const variants = this.getProductVariants(product);
        const hasOutOfStock = variants.some(variant => variant.stockQuantity === 0);
        if (hasOutOfStock) count++;
      } else {
        if (product.stockQuantity === 0) {
          count++;
        }
      }
    });
    return count;
  }

  // Get overall stock status for a product (for collapsed view indicators)
  getProductStockStatus(product: any): 'out-of-stock' | 'low-stock' | 'in-stock' {
    if (this.hasVariants(product)) {
      const variants = this.getProductVariants(product);
      const hasOutOfStock = variants.some(variant => variant.stockQuantity === 0);
      const hasLowStock = variants.some(variant => 
        variant.stockQuantity > 0 && variant.stockQuantity <= 10
      );
      
      if (hasOutOfStock) return 'out-of-stock';
      if (hasLowStock) return 'low-stock';
      return 'in-stock';
    } else {
      if (product.stockQuantity === 0) return 'out-of-stock';
      if (product.stockQuantity > 0 && product.stockQuantity <= 10) return 'low-stock';
      return 'in-stock';
    }
  }

  // Get multiple stock statuses for products with both low stock and out of stock variants
  getProductStockStatuses(product: any): string[] {
    if (this.hasVariants(product)) {
      const variants = this.getProductVariants(product);
      const hasOutOfStock = variants.some(variant => variant.stockQuantity === 0);
      const hasLowStock = variants.some(variant => 
        variant.stockQuantity > 0 && variant.stockQuantity <= 10
      );
      
      const statuses: string[] = [];
      if (hasOutOfStock) statuses.push('out-of-stock');
      if (hasLowStock) statuses.push('low-stock');
      
      // If no issues, show in-stock
      if (statuses.length === 0) statuses.push('in-stock');
      
      return statuses;
    } else {
      if (product.stockQuantity === 0) return ['out-of-stock'];
      if (product.stockQuantity > 0 && product.stockQuantity <= 10) return ['low-stock'];
      return ['in-stock'];
    }
  }

  // Get stock status text for display
  getStockStatusText(product: any): string {
    const status = this.getProductStockStatus(product);
    switch (status) {
      case 'out-of-stock': return 'Out of Stock';
      case 'low-stock': return 'Low Stock';
      case 'in-stock': return 'In Stock';
      default: return 'Unknown';
    }
  }

  // Get individual status text for multiple indicators
  getStatusText(status: string): string {
    switch (status) {
      case 'out-of-stock': return 'Out of Stock';
      case 'low-stock': return 'Low Stock';
      case 'in-stock': return 'In Stock';
      default: return 'Unknown';
    }
  }

  // Filter Methods
  getFilteredProducts(): Product[] {
    if (this.showAll) {
      return this.products;
    }
    
    return this.products.filter(product => {
      if (this.showLowStock) {
        return this.hasLowStock(product);
      }
      if (this.showOutOfStock) {
        return this.hasOutOfStock(product);
      }
      return true;
    });
  }

  hasLowStock(product: Product): boolean {
    if (this.hasVariants(product)) {
      const variants = this.getProductVariants(product);
      return variants.some(variant => 
        variant.stockQuantity > 0 && variant.stockQuantity <= 10
      );
    } else {
      return product.stockQuantity > 0 && product.stockQuantity <= 10;
    }
  }

  hasOutOfStock(product: Product): boolean {
    if (this.hasVariants(product)) {
      const variants = this.getProductVariants(product);
      return variants.some(variant => variant.stockQuantity === 0);
    } else {
      return product.stockQuantity === 0;
    }
  }

  // Helper methods for stock indicators
  hasAnyLowStock(product: Product): boolean {
    if (this.hasVariants(product)) {
      const variants = this.getProductVariants(product);
      return variants.some(variant => variant.stockQuantity > 0 && variant.stockQuantity <= 10);
    } else {
      return product.stockQuantity > 0 && product.stockQuantity <= 10;
    }
  }

  hasAnyOutOfStock(product: Product): boolean {
    if (this.hasVariants(product)) {
      const variants = this.getProductVariants(product);
      return variants.some(variant => variant.stockQuantity === 0);
    } else {
      return product.stockQuantity === 0;
    }
  }

  toggleLowStockFilter(): void {
    this.showLowStock = !this.showLowStock;
    this.showOutOfStock = false;
    this.showAll = false;
  }

  toggleOutOfStockFilter(): void {
    this.showOutOfStock = !this.showOutOfStock;
    this.showLowStock = false;
    this.showAll = false;
  }

  showAllProducts(): void {
    this.showAll = true;
    this.showLowStock = false;
    this.showOutOfStock = false;
  }

  applyFilterFromQuery(filterType: string): void {
    switch (filterType) {
      case 'lowStock':
        this.showLowStock = true;
        this.showOutOfStock = false;
        this.showAll = false;
        break;
      case 'outOfStock':
        this.showOutOfStock = true;
        this.showLowStock = false;
        this.showAll = false;
        break;
      default:
        this.showAll = true;
        this.showLowStock = false;
        this.showOutOfStock = false;
    }
  }

  // Collapse Methods
  isProductCollapsed(index: number): boolean {
    return this.collapsedProducts.has(index);
  }

  toggleProductCollapse(index: number): void {
    if (this.collapsedProducts.has(index)) {
      this.collapsedProducts.delete(index);
    } else {
      this.collapsedProducts.add(index);
    }
  }

}