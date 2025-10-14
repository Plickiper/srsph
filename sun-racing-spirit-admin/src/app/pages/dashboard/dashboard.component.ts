import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminDashboardService, DashboardData } from '../../services/admin-dashboard.service';
import { Order } from '../../services/admin-order.service';
import { Product, AdminProductService } from '../../services/admin-product.service';
import { interval, Subscription } from 'rxjs';
import { BaseComponent } from '../../core/base-component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="dashboard">
      <div class="dashboard-header">
        <div class="header-content">
          <h1 class="dashboard-title">Dashboard</h1>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error && !loading" class="error-container">
        <div class="error-icon">⚠️</div>
        <h3>Unable to Load Dashboard Data</h3>
        <p>{{ error }}</p>
        <button class="btn btn-primary" (click)="refreshData()">Try Again</button>
      </div>

      <!-- Dashboard Content -->
      <div *ngIf="!loading && !error" class="dashboard-content">

      <div class="stats-grid">
        <div class="stat-card clickable" (click)="navigateToProducts()">
          <div class="stat-icon products">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ dashboardData?.stats?.totalProducts || 0 }}</div>
            <div class="stat-label">Total Products</div>
            <div class="stat-change" [class.positive]="(dashboardData?.stats?.lowStockProducts || 0) === 0 && (dashboardData?.stats?.outOfStockProducts || 0) === 0" [class.negative]="(dashboardData?.stats?.outOfStockProducts || 0) > 0">
              <div class="stock-indicators">
                <span *ngIf="(dashboardData?.stats?.outOfStockProducts || 0) > 0" class="stock-alert out-of-stock" (click)="navigateToInventoryModal($event, 'outOfStock')">
                  {{ dashboardData?.stats?.outOfStockProducts || 0 }} out of stock
                </span>
                <span *ngIf="(dashboardData?.stats?.lowStockProducts || 0) > 0" class="stock-alert low-stock" (click)="navigateToInventoryModal($event, 'lowStock')">
                  {{ dashboardData?.stats?.lowStockProducts || 0 }} low stock
                </span>
                <span *ngIf="(dashboardData?.stats?.outOfStockProducts || 0) === 0 && (dashboardData?.stats?.lowStockProducts || 0) === 0" class="stock-alert in-stock">
                  All products in stock
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="stat-card clickable" (click)="navigateToOrders()">
          <div class="stat-icon orders">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 22C9.55228 22 10 21.5523 10 21C10 20.4477 9.55228 20 9 20C8.44772 20 8 20.4477 8 21C8 21.5523 8.44772 22 9 22Z"></path>
              <path d="M20 22C20.5523 22 21 21.5523 21 21C21 20.4477 20.5523 20 20 20C19.4477 20 19 20.4477 19 21C19 21.5523 19.4477 22 20 22Z"></path>
              <path d="M1 1H5L7.68 14.39C7.77144 14.8504 8.02191 15.264 8.38755 15.5583C8.75318 15.8526 9.2107 16.009 9.68 16H19.4C19.8693 16.009 20.3268 15.8526 20.6925 15.5583C21.0581 15.264 21.3086 14.8504 21.4 14.39L23 6H6"></path>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ dashboardData?.stats?.totalOrders || 0 }}</div>
            <div class="stat-label">Total Orders</div>
            <div class="stat-change" [class.positive]="(dashboardData?.stats?.pendingOrders || 0) === 0" [class.negative]="(dashboardData?.stats?.pendingOrders || 0) > 0">
              <div class="order-indicators">
                <span *ngIf="(dashboardData?.stats?.pendingOrders || 0) > 0" class="order-alert pending" (click)="navigateToOrdersModal($event, 'pending')">
                  {{ dashboardData?.stats?.pendingOrders || 0 }} pending
                </span>
                <span *ngIf="(dashboardData?.stats?.processingOrders || 0) > 0" class="order-alert processing" (click)="navigateToOrdersModal($event, 'processing')">
                  {{ dashboardData?.stats?.processingOrders || 0 }} processing
                </span>
                <span *ngIf="(dashboardData?.stats?.pendingOrders || 0) === 0 && (dashboardData?.stats?.processingOrders || 0) === 0" class="order-alert all-processed">
                  All orders processed
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="stat-card clickable" (click)="navigateToOrders()">
          <div class="stat-icon revenue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-number">₱{{ (dashboardData?.stats?.totalRevenue || 0).toLocaleString() }}</div>
            <div class="stat-label">Total Sold</div>
            <div class="stat-change positive">
              {{ dashboardData?.stats?.completedOrders || 0 }} completed orders
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon users">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ dashboardData?.stats?.totalUsers || 0 }}</div>
            <div class="stat-label">Total Users</div>
            <div class="stat-change positive">
              Active customers
            </div>
          </div>
        </div>
      </div>


      <div class="dashboard-grid">
        <div class="dashboard-card">
          <div class="card-header">
            <h3>Recent Orders</h3>
            <div class="card-header-actions">
              <a routerLink="/orders" class="view-all-btn">View All</a>
            </div>
          </div>
          <div class="card-content">
            <div class="recent-orders-list">
              <div class="order-item" *ngFor="let order of dashboardData?.recentOrders">
                <div class="order-info">
                  <div class="order-header">
                    <div class="order-id">#{{ order.id }}</div>
                    <div class="order-timestamp">{{ formatTimestamp(order.createdAt) }}</div>
                  </div>
                  <div class="order-products">
                    <div class="product-item" *ngFor="let item of order.items">
                      <img [src]="(item.product && item.product.imageUrl) ? item.product.imageUrl : placeholderImg" alt="" class="item-image" />
                      <div class="item-details">
                        <div class="item-name">{{ (item.product && item.product.name) || 'Product' }}</div>
                        <div class="item-meta">
                          <span class="variant" *ngIf="hasVariants(item.product)">{{ item.compatibility || 'Universal' }}</span>
                          <span class="quantity">Qty: {{ item.quantity }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="order-stats">
                  <span class="status-badge"
                        [class.placed]="order.status==='PENDING'"
                        [class.out]="order.status==='SHIPPED'"
                        [class.delivered]="order.status==='DELIVERED'"
                        [class.cancelled]="order.status==='CANCELLED'">
                    {{ formatOrderStatus(order.status) }}
                  </span>
                  <div class="order-amount">₱{{ order.totalAmount | number:'1.0-0' }}</div>
                </div>
              </div>
              <div *ngIf="!dashboardData?.recentOrders?.length" class="no-data">
                No recent orders available
              </div>
            </div>
          </div>
        </div>

        <div class="dashboard-card">
          <div class="card-header">
            <h3>Top Products</h3>
            <div class="card-header-actions">
              <div class="filter-tabs">
                <button class="filter-tab" [class.active]="topProductsFilter === 'sold'" (click)="setTopProductsFilter('sold')">Most Sold</button>
                <button class="filter-tab" [class.active]="topProductsFilter === 'rated'" (click)="setTopProductsFilter('rated')">Most Rated</button>
                <button class="filter-tab" [class.active]="topProductsFilter === 'category'" (click)="setTopProductsFilter('category')">Categories</button>
              </div>
            </div>
          </div>
          <div class="card-content">
            <div class="product-list">
              <div class="product-item" *ngFor="let product of getFilteredTopProducts()">
                <div class="product-info">
                  <div class="product-name">{{ topProductsFilter === 'category' ? product.category : product.name }}</div>
                  <div class="product-category" *ngIf="topProductsFilter !== 'category'">{{ product.category }}</div>
                </div>
                <div class="product-stats">
                  <div class="product-sales" *ngIf="topProductsFilter === 'sold'">{{ product.sales }} sold</div>
                  <div class="product-rating" *ngIf="topProductsFilter === 'rated'">
                    <div class="stars">
                      <span *ngFor="let star of getStars(product.rating || 0)" class="star">{{ star }}</span>
                    </div>
                    <span class="rating-value">{{ formatRating(product.rating || 0) }}</span>
                  </div>
                  <div class="product-category-count" *ngIf="topProductsFilter === 'category'">{{ product.sales }} sold</div>
                  <div class="product-revenue">₱{{ product.revenue.toLocaleString() }}</div>
                </div>
              </div>
              <div *ngIf="!getFilteredTopProducts()?.length" class="no-data">
                No product data available
              </div>
            </div>
          </div>
        </div>

      </div>

      </div> <!-- End dashboard-content -->
    </div>
  `,
  styles: [`
    .dashboard {
      padding: 40px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .dashboard-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 40px;
      flex-wrap: wrap;
      gap: 20px;
    }

    .header-content {
      flex: 1;
    }


    .dashboard-title {
      font-size: 2.5rem;
      font-weight: 700;
      color: white;
      margin: 0 0 8px 0;
    }

    .dashboard-subtitle {
      font-size: 1.1rem;
      color: rgba(255, 255, 255, 0.7);
      margin: 0;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      margin-bottom: 40px;
    }

    .stat-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 20px;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
    }

    .stat-card:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .stat-card.clickable {
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .stat-card.clickable:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: translateY(-3px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    }

    .stat-icon {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-icon.products {
      background: linear-gradient(135deg, #ff8c00, #ffd700);
      color: white;
    }

    .stat-icon.orders {
      background: linear-gradient(135deg, #3b82f6, #1e40af);
      color: white;
    }

    .stat-icon.revenue {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
    }

    .stat-icon.users {
      background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      color: white;
    }

    .stat-content {
      flex: 1;
    }

    .stat-number {
      font-size: 2rem;
      font-weight: 700;
      color: white;
      line-height: 1;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 6px;
    }

    .stat-change {
      font-size: 0.8rem;
      font-weight: 600;
    }

    .stat-change.positive {
      color: #10b981;
    }

    .stat-change.negative {
      color: #ef4444;
    }

    .stock-alert {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .stock-alert.out-of-stock {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .stock-alert.low-stock {
      background: rgba(251, 191, 36, 0.2);
      color: #fbbf24;
    }

    .stock-alert.in-stock {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }

    .stock-indicators {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .stock-alert.out-of-stock,
    .stock-alert.low-stock {
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .stock-alert.out-of-stock:hover,
    .stock-alert.low-stock:hover {
      transform: scale(1.05);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .order-indicators {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .order-alert {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .order-alert.pending {
      background: rgba(251, 191, 36, 0.2);
      color: #fbbf24;
    }

    .order-alert.processing {
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
    }

    .order-alert.all-processed {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }

    .order-alert.pending,
    .order-alert.processing {
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .order-alert.pending:hover,
    .order-alert.processing:hover {
      transform: scale(1.05);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
    }

    .dashboard-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      backdrop-filter: blur(10px);
      overflow: hidden;
    }

    .dashboard-card.full-width {
      grid-column: 1 / -1;
    }

    .card-header {
      padding: 24px 24px 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }

    .card-header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }



    .filter-tabs {
      display: flex;
      gap: 4px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 4px;
    }

    .filter-tab {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .filter-tab:hover {
      color: rgba(255, 255, 255, 0.8);
      background: rgba(255, 255, 255, 0.05);
    }

    .filter-tab.active {
      background: #ff8c00;
      color: white;
      font-weight: 600;
    }

    .card-header h3 {
      font-size: 1.3rem;
      font-weight: 600;
      color: white;
      margin: 0;
    }

    .view-all-btn {
      color: #ff8c00;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.9rem;
      transition: color 0.3s ease;
    }

    .view-all-btn:hover {
      color: #ffd700;
    }

    .card-content {
      padding: 0 24px 24px 24px;
    }

    .product-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .product-list .product-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      transition: all 0.3s ease;
    }

    .product-list .product-item:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    .product-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .product-name {
      font-weight: 600;
      color: white;
    }

    .product-category {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.6);
    }

    /* Recent Orders List Styles - Compact like Top Products */
    .recent-orders-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .order-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      transition: all 0.3s ease;
    }

    .order-item:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    .order-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
      margin-right: 12px;
    }

    .order-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .order-id {
      color: white;
      font-weight: 600;
      font-size: 0.85rem;
    }

    .order-timestamp {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.8rem;
    }

    .order-products {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-right: 8px;
    }

    .recent-orders-list .product-item {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 8px;
    }

    .item-image {
      width: 32px;
      height: 32px;
      object-fit: cover;
      border-radius: 4px;
      background: #111;
      border: 1px solid #222;
      flex-shrink: 0;
    }

    .item-details {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: flex-start;
      gap: 3px;
    }

    .item-name {
      color: white;
      font-weight: 500;
      font-size: 0.8rem;
    }

    .item-meta {
      display: flex;
      gap: 6px;
      align-items: center;
      justify-content: flex-start;
    }

    .variant {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.7rem;
      background: rgba(255, 140, 0, 0.1);
      padding: 1px 4px;
      border-radius: 3px;
      border: 1px solid rgba(255, 140, 0, 0.2);
    }

    .quantity {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.7rem;
      font-weight: 500;
    }

    .order-stats {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      min-width: 100px;
      flex-shrink: 0;
    }

    .status-badge {
      padding: 2px 6px;
      border-radius: 8px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.placed {
      background: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
    }

    .status-badge.out {
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
    }

    .status-badge.delivered {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }

    .status-badge.cancelled {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .order-amount {
      color: white;
      font-weight: 600;
      font-size: 1rem;
    }

    .product-stats {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: center;
      gap: 8px;
      text-align: right;
      min-width: 80px;
    }

    .product-revenue {
      font-weight: 600;
      color: white;
      text-align: right;
      width: 100%;
    }

    .product-sales {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.7);
      font-weight: 500;
      text-align: right;
      width: 100%;
    }

    .product-category-count {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.7);
      font-weight: 500;
      text-align: right;
      width: 100%;
    }

    .product-rating {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }

    .stars {
      display: flex;
      gap: 1px;
    }

    .star {
      font-size: 0.8rem;
      line-height: 1;
      color: #ffd700;
    }

    .rating-value {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.6);
      font-weight: 500;
    }


    @media (max-width: 768px) {
      .dashboard {
        padding: 20px;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Loading States */
    .loading-container {
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

    /* Error States */
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      text-align: center;
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

    /* No Data States */
    .no-data {
      text-align: center;
      padding: 40px 20px;
      color: rgba(255, 255, 255, 0.5);
      font-style: italic;
    }

  `]
})
export class DashboardComponent extends BaseComponent implements OnInit, OnDestroy {
  dashboardData: DashboardData | null = null;
  loading = true;
  error: string | null = null;
  topProductsFilter: 'sold' | 'rated' | 'category' = 'sold';
  private ratingsCache = new Map<number, number>();
  pollingSubscription: Subscription | null = null;
  private readonly POLLING_INTERVAL = 300000; // 5 minutes instead of 15 seconds to reduce server load
  placeholderImg = 'data:image/svg+xml;utf8,%3Csvg xmlns%3D"http%3A//www.w3.org/2000/svg" width%3D"60" height%3D"60"/%3E';

  constructor(
    private dashboardService: AdminDashboardService,
    private adminProductService: AdminProductService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {
    super();
  }

  hasVariants(product: any): boolean {
    if (!product) return false;
    const models = this.getCompatibilityModels(product);
    return models.length > 0;
  }

  getCompatibilityModels(product: any): string[] {
    if (!product || !product.compatibility) return [];
    return product.compatibility.split(',').map((model: string) => model.trim());
  }

  ngOnInit() {
    this.loadDashboardData();
    // Start polling after initial data is loaded
    setTimeout(() => this.startPolling(), 2000);
  }

  override ngOnDestroy() {
    this.stopPolling();
    super.ngOnDestroy();
  }

  loadDashboardData() {
    this.loading = true;
    this.error = null;

    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        this.dashboardData = data;
        // Populate ratings for Top Products (Most Rated) using backend stats
        const ids = (data.topProducts || []).map(tp => tp.id).filter((id): id is number => typeof id === 'number');
        // Fetch ratings sequentially but lightweight; cache to avoid redundant calls during refresh
        ids.forEach(id => this.fetchRatingForProduct(id));
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.error = 'Failed to load dashboard data. Please try again later.';
        this.loading = false;
      }
    });
  }


  refreshData() {
    this.loadDashboardData();
    this.startPolling(); // Restart polling after manual refresh
  }

  navigateToProducts() {
    this.router.navigate(['/products']);
  }

  navigateToOrders() {
    this.router.navigate(['/orders']);
  }

  navigateToInventoryModal(event: Event, filterType?: string) {
    event.stopPropagation();
    // Navigate to products page and trigger inventory modal with filter
    const queryParams: any = { showInventory: 'true' };
    if (filterType) {
      queryParams.filter = filterType;
    }
    this.router.navigate(['/products'], { queryParams });
  }

  navigateToOrdersModal(event: Event, filterType?: string) {
    event.stopPropagation();
    // Navigate to orders page with specific filter
    const queryParams: any = {};
    if (filterType === 'pending') {
      queryParams.tab = 'TO_SHIP';
    } else if (filterType === 'processing') {
      queryParams.tab = 'TO_RECEIVE';
    }
    this.router.navigate(['/orders'], { queryParams });
  }

  formatOrderStatus(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'PENDING';
      case 'SHIPPED':
        return 'SHIPPED';
      case 'DELIVERED':
        return 'DELIVERED';
      case 'CANCELLED':
        return 'CANCELLED';
      default:
        return status;
    }
  }

  formatTimestamp(timestamp: string): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  setTopProductsFilter(filter: 'sold' | 'rated' | 'category') {
    this.topProductsFilter = filter;
  }

  getStars(rating: number): string[] {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push('★');
      } else if (i === fullStars && hasHalfStar) {
        stars.push('☆');
      } else {
        stars.push('☆');
      }
    }
    return stars;
  }

  formatRating(rating: number): string {
    if (rating === 0) return 'No ratings';
    return rating.toFixed(1);
  }

  onFilterChange() {
  }

  getFilteredTopProducts() {
    if (!this.dashboardData) return [];

    switch (this.topProductsFilter) {
      case 'sold':
        if (!this.dashboardData.topProducts) return [];
        return [...this.dashboardData.topProducts].sort((a, b) => (b.sales || 0) - (a.sales || 0));
      case 'rated':
        if (!this.dashboardData.topProducts) return [];
        // Use fetched ratings, fallback to existing value
        const enriched = this.dashboardData.topProducts.map(p => ({
          ...p,
          rating: this.ratingsCache.get(p.id) ?? p.rating ?? 0
        }));
        return enriched.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'category':
        if (!this.dashboardData.topCategories) return [];
        return [...this.dashboardData.topCategories].sort((a, b) => (b.sales || 0) - (a.sales || 0));
      default:
        return this.dashboardData.topProducts || [];
    }
  }

  private fetchRatingForProduct(productId: number) {
    if (this.ratingsCache.has(productId)) return;

    // Use the injected AdminProductService
    this.adminProductService.getProductRatingStats(productId).subscribe({
      next: (stats) => {
        this.ratingsCache.set(productId, stats.averageRating);
        // Trigger change detection to update the UI
        this.cd.detectChanges();
      },
      error: (error) => {
        console.error(`Failed to fetch rating for product ${productId}:`, error);
        // Set a default rating of 0 if fetch fails
        this.ratingsCache.set(productId, 0);
      }
    });
  }

  private startPolling() {
    // Stop any existing polling
    this.stopPolling();

    // Start new polling for recent orders
    this.pollingSubscription = interval(this.POLLING_INTERVAL).subscribe(() => {
      this.refreshRecentOrders();
    });

    // Add to base component subscriptions for automatic cleanup
    this.addSubscription(this.pollingSubscription);
  }

  private stopPolling() {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  private refreshRecentOrders() {
    // Silently refresh recent orders data in the background
    this.addSubscription(
      this.dashboardService.getRecentOrders().subscribe({
        next: (recentOrders) => {
          if (this.dashboardData) {
            // Check if the data actually changed to avoid unnecessary updates
            const currentOrders = this.dashboardData.recentOrders || [];
            const hasChanged = this.hasRecentOrdersChanged(currentOrders, recentOrders);

            if (hasChanged) {
              this.dashboardData.recentOrders = recentOrders;
              // Trigger change detection to update the UI
              this.cd.detectChanges();
            }
          }
        },
        error: (error) => {
          console.error('Error refreshing recent orders:', error);
          // Silent error handling for background refresh
        }
      })
    );
  }

  private hasRecentOrdersChanged(current: any[], newOrders: any[]): boolean {
    // Check if count changed
    if (current.length !== newOrders.length) {
      return true;
    }

    // Check if any order status or details changed
    for (let i = 0; i < current.length; i++) {
      const currentOrder = current[i];
      const newOrder = newOrders[i];

      if (currentOrder.id !== newOrder.id ||
          currentOrder.status !== newOrder.status ||
          currentOrder.totalAmount !== newOrder.totalAmount) {
        return true;
      }
    }

    return false;
  }
}
