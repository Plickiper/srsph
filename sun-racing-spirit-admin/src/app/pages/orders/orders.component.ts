import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { AdminOrderService } from '../../services/admin-order.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Orders</h1>
        <p>Manage customer orders and shipments</p>
      </div>
      <div class="page-content">
        <div class="tabs">
          <button class="tab" [class.active]="tab==='ALL'" (click)="setTab('ALL')">All</button>
          <button class="tab" [class.active]="tab==='TO_SHIP'" (click)="setTab('TO_SHIP')">To Ship</button>
          <button class="tab" [class.active]="tab==='TO_RECEIVE'" (click)="setTab('TO_RECEIVE')">To Receive</button>
          <button class="tab" [class.active]="tab==='COMPLETED'" (click)="setTab('COMPLETED')">Completed</button>
        </div>

        
        <div class="orders-table-container">
          <div class="table-header">
            <div class="table-info">
              <span class="order-count">{{ filtered.length }} orders</span>
            </div>
          </div>

          <div class="table-wrapper">
            <table class="orders-table">
              <thead>
                <tr>
                  <th class="order-info">Order</th>
                  <th class="customer">Customer</th>
                  <th class="total">Total</th>
                  <th class="status">Status</th>
                  <th class="actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let o of filtered" class="order-row">
                  <td class="order-info">
                    <div class="order-details">
                      <div class="order-header">
                        <div class="order-id">#{{ o.id }}</div>
                        <div class="order-timestamp">{{ formatTimestamp(o.createdAt) }}</div>
                      </div>
                      <div class="order-items">
                        <div class="order-item" *ngFor="let it of o.items">
                          <img [src]="(it.product && it.product.imageUrl) ? it.product.imageUrl : placeholderImg" alt="" class="item-image" />
                          <div class="item-info">
                            <div class="item-name">{{ (it.product && it.product.name) || 'Product' }}</div>
                            <div class="item-meta">Variant: {{ it.compatibility || 'Universal' }} · Qty: {{ it.quantity }}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="customer">
                    <div class="customer-info">
                      <div class="customer-name">{{ o.recipientName || 'N/A' }}</div>
                      <div class="customer-phone">{{ o.recipientPhone || 'N/A' }}</div>
                    </div>
                  </td>
                  <td class="total">
                    <div class="total-amount">₱{{ grandTotal(o) | number:'1.0-0' }}</div>
                  </td>
                  <td class="status">
                    <span class="status-badge" 
                          [class.placed]="o.status==='PENDING'" 
                          [class.out]="o.status==='SHIPPED'" 
                          [class.delivered]="o.status==='DELIVERED'">
                      {{ statusLabel(o.status) }}
                    </span>
                  </td>
                  <td class="actions">
                    <div class="action-buttons">
                      <button class="btn-action btn-ship" 
                              *ngIf="o.status==='PENDING'" 
                              (click)="openShipModal(o)" 
                              title="Mark Out for Delivery">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M1 3h15v13H1z"></path>
                          <path d="M16 8h4l3 3v5h-7V8z"></path>
                          <circle cx="5.5" cy="18.5" r="2.5"></circle>
                          <circle cx="18.5" cy="18.5" r="2.5"></circle>
                        </svg>
                      </button>
                      <button class="btn-action btn-delivered" 
                              *ngIf="o.status==='SHIPPED'" 
                              (click)="openDeliveredModal(o)" 
                              title="Mark Delivered">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M9 12l2 2 4-4"></path>
                          <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"></path>
                        </svg>
                      </button>
                      <button class="btn-action btn-view" 
                              *ngIf="o.status==='DELIVERED'" 
                              (click)="openCompletedModal(o)" 
                              title="View Order Details">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Out for Delivery Modal -->
        <div class="modal-backdrop" *ngIf="shipModal">
          <div class="modal">
            <div class="modal-header">
              <h3>Prepare Shipment</h3>
              <button class="close-btn" (click)="closeModals()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <!-- Order Items Card -->
              <div class="info-card">
                <div class="card-header">
                  <h4>Order Items</h4>
                </div>
                <div class="order-items-list" *ngIf="activeOrder">
                  <div class="order-item-card" *ngFor="let it of activeOrder.items">
                    <img [src]="(it.product && it.product.imageUrl) ? it.product.imageUrl : placeholderImg" class="item-image"/>
                    <div class="item-details">
                      <div class="item-name">{{ (it.product && it.product.name) || 'Product' }}</div>
                      <div class="item-meta">
                        <span class="sku-badge">SKU: {{ it.product?.partNumber || 'N/A' }}</span>
                        <span class="variant-badge">Variant: {{ it.compatibility || 'Universal' }}</span>
                        <span class="quantity-badge">Qty: {{ it.quantity }}</span>
                      </div>
                      <div class="item-price">₱{{ (it.price * it.quantity) | number:'1.0-0' }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Customer Info Card -->
              <div class="info-card">
                <div class="card-header">
                  <h4>Customer Information</h4>
                </div>
                <div class="customer-details">
                  <div class="detail-row">
                    <div class="detail-label">Customer Name</div>
                    <div class="detail-value">{{ activeOrder?.recipientName || 'N/A' }}</div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-label">Phone Number</div>
                    <div class="detail-value">{{ activeOrder?.recipientPhone || 'N/A' }}</div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-label">Email Address</div>
                    <div class="detail-value">{{ activeOrder?.user?.email || 'N/A' }}</div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-label">Delivery Address</div>
                    <div class="detail-value address-text">{{ activeOrder?.deliveryAddress || 'N/A' }}</div>
                  </div>
                </div>
              </div>

              <!-- Order Summary Section -->
              <div class="info-card">
                <div class="card-header">
                  <h4>Order Summary</h4>
                </div>
                <div class="order-summary">
                  <div class="summary-row">
                    <div class="summary-label">Items Total</div>
                    <div class="summary-value">₱{{ getItemsTotal(activeOrder) | number:'1.0-0' }}</div>
                  </div>
                  <div class="summary-row">
                    <div class="summary-label">Shipping Fee</div>
                    <div class="summary-value">₱{{ getShippingFee(activeOrder) | number:'1.0-0' }}</div>
                  </div>
                  <div class="summary-row total-row">
                    <div class="summary-label">Total Amount</div>
                    <div class="summary-value">₱{{ grandTotal(activeOrder) | number:'1.0-0' }}</div>
                  </div>
                  <div class="summary-row">
                    <div class="summary-label">Payment Method</div>
                        <div class="summary-value payment-method">{{ getPaymentMethodLabel(activeOrder?.paymentMethod) }}</div>
                  </div>
                </div>
              </div>

              <!-- Upload Section -->
              <div class="info-card">
                <div class="card-header">
                  <h4>Upload Waybill Proof</h4>
                </div>
                <div class="upload-section">
                  <label class="file-upload-btn" *ngIf="!waybillFile">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7,10 12,15 17,10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <span>Choose Waybill Image</span>
                    <input type="file" (change)="onWaybillSelected($event)" accept="image/*"/>
                  </label>
                  
                  <div class="file-preview" *ngIf="waybillFile">
                    <div class="file-info">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                      </svg>
                      <span>{{ waybillName }}</span>
                    </div>
                    <div class="image-preview">
                      <img [src]="waybillPreviewUrl" alt="Waybill Preview" class="preview-image"/>
                    </div>
                    <div class="file-actions">
                      <label class="btn-replace">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7,10 12,15 17,10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Replace
                        <input type="file" (change)="onWaybillSelected($event)" accept="image/*"/>
                      </label>
                      <button class="btn-remove" (click)="removeWaybillFile()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn btn-secondary" (click)="closeModals()">Cancel</button>
              <button class="btn btn-primary" (click)="confirmOutForDelivery()" [disabled]="!waybillFile">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 3h15v13H1z"></path>
                  <path d="M16 8h4l3 3v5h-7V8z"></path>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
                Ship Order
              </button>
            </div>
          </div>
        </div>

        <!-- Delivered Modal -->
        <div class="modal-backdrop" *ngIf="deliveredModal">
          <div class="modal">
            <div class="modal-header">
              <h3>Mark as Delivered</h3>
              <button class="close-btn" (click)="closeModals()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <!-- Order Items Card -->
              <div class="info-card">
                <div class="card-header">
                  <h4>Order Items</h4>
                </div>
                <div class="order-items-list" *ngIf="activeOrder">
                  <div class="order-item-card" *ngFor="let it of activeOrder.items">
                    <img [src]="(it.product && it.product.imageUrl) ? it.product.imageUrl : placeholderImg" class="item-image"/>
                    <div class="item-details">
                      <div class="item-name">{{ (it.product && it.product.name) || 'Product' }}</div>
                      <div class="item-meta">
                        <span class="sku-badge">SKU: {{ it.product?.partNumber || 'N/A' }}</span>
                        <span class="variant-badge">Variant: {{ it.compatibility || 'Universal' }}</span>
                        <span class="quantity-badge">Qty: {{ it.quantity }}</span>
                      </div>
                      <div class="item-price">₱{{ (it.price * it.quantity) | number:'1.0-0' }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Customer Info Card -->
              <div class="info-card">
                <div class="card-header">
                  <h4>Customer Information</h4>
                </div>
                <div class="customer-details">
                  <div class="detail-row">
                    <div class="detail-label">Customer Name</div>
                    <div class="detail-value">{{ activeOrder?.recipientName || 'N/A' }}</div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-label">Phone Number</div>
                    <div class="detail-value">{{ activeOrder?.recipientPhone || 'N/A' }}</div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-label">Email Address</div>
                    <div class="detail-value">{{ activeOrder?.user?.email || 'N/A' }}</div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-label">Delivery Address</div>
                    <div class="detail-value address-text">{{ activeOrder?.deliveryAddress || 'N/A' }}</div>
                  </div>
                </div>
              </div>

              <!-- Order Summary Card -->
              <div class="info-card">
                <div class="card-header">
                  <h4>Order Summary</h4>
                </div>
                <div class="order-summary">
                  <div class="summary-row">
                    <div class="summary-label">Items Total</div>
                    <div class="summary-value">₱{{ getItemsTotal(activeOrder) | number:'1.0-0' }}</div>
                  </div>
                  <div class="summary-row">
                    <div class="summary-label">Shipping Fee</div>
                    <div class="summary-value">₱{{ getShippingFee(activeOrder) | number:'1.0-0' }}</div>
                  </div>
                  <div class="summary-row total-row">
                    <div class="summary-label">Total Amount</div>
                    <div class="summary-value">₱{{ grandTotal(activeOrder) | number:'1.0-0' }}</div>
                  </div>
                  <div class="summary-row">
                    <div class="summary-label">Payment Method</div>
                        <div class="summary-value payment-method">{{ getPaymentMethodLabel(activeOrder?.paymentMethod) }}</div>
                  </div>
                </div>
              </div>

              <!-- Waybill Proof Preview -->
              <div class="info-card" *ngIf="activeOrder?.waybillProofUrl">
                <div class="card-header">
                  <h4>Waybill Proof</h4>
                </div>
                <div class="proof-preview-section">
                  <img [src]="getFullImageUrl(activeOrder.waybillProofUrl)" alt="Waybill Proof" class="proof-image"/>
                </div>
              </div>
              
              <!-- Debug: Show waybill status -->
              <div class="info-card" *ngIf="!activeOrder?.waybillProofUrl">
                <div class="card-header">
                  <h4>Waybill Proof</h4>
                </div>
                <div class="proof-preview-section">
                  <div class="no-proof-message">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14,2 14,8 20,8"></polyline>
                    </svg>
                    <span>No waybill proof uploaded yet</span>
                  </div>
                </div>
              </div>

              <!-- Upload Delivery Proof Section -->
              <div class="info-card">
                <div class="card-header">
                  <h4>Upload Delivery Proof</h4>
                </div>
                <div class="upload-section">
                  <label class="file-upload-btn" *ngIf="!deliveryFile">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7,10 12,15 17,10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <span>Choose Delivery Image</span>
                    <input type="file" (change)="onDeliveryProofSelected($event)" accept="image/*"/>
                  </label>
                  
                  <div class="file-preview" *ngIf="deliveryFile">
                    <div class="file-info">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                      </svg>
                      <span>{{ deliveryFile.name }}</span>
                    </div>
                    <div class="image-preview">
                      <img [src]="deliveryPreviewUrl" alt="Delivery Proof Preview" class="preview-image"/>
                    </div>
                    <div class="file-actions">
                      <label class="btn-replace">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7,10 12,15 17,10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Replace
                        <input type="file" (change)="onDeliveryProofSelected($event)" accept="image/*"/>
                      </label>
                      <button class="btn-remove" (click)="removeDeliveryFile()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Remove
                      </button>
                    </div>
          </div>
        </div>
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn btn-secondary" (click)="closeModals()">Cancel</button>
              <button class="btn btn-primary" (click)="confirmDelivered()" [disabled]="!deliveryFile">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 12l2 2 4-4"></path>
                  <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"></path>
                </svg>
                Confirm Delivery
              </button>
            </div>
          </div>
        </div>

        <!-- Completed Order Details Modal -->
        <div class="modal-backdrop" *ngIf="completedModal">
          <div class="modal">
            <div class="modal-header">
              <h3>Order Details (Completed)</h3>
              <button class="close-btn" (click)="closeModals()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <!-- Order Items Card -->
              <div class="info-card">
                <div class="card-header">
                  <h4>Order Items</h4>
                </div>
                <div class="order-items-list" *ngIf="activeOrder">
                  <div class="order-item-card" *ngFor="let it of activeOrder.items">
                    <img [src]="(it.product && it.product.imageUrl) ? it.product.imageUrl : placeholderImg" class="item-image"/>
                    <div class="item-details">
                      <div class="item-name">{{ (it.product && it.product.name) || 'Product' }}</div>
                      <div class="item-meta">
                        <span class="sku-badge">SKU: {{ it.product?.partNumber || 'N/A' }}</span>
                        <span class="variant-badge">Variant: {{ it.compatibility || 'Universal' }}</span>
                        <span class="quantity-badge">Qty: {{ it.quantity }}</span>
                      </div>
                      <div class="item-price">₱{{ (it.price * it.quantity) | number:'1.0-0' }}</div>
          </div>
        </div>
                </div>
              </div>

              <!-- Customer Info Card -->
              <div class="info-card">
                <div class="card-header">
                  <h4>Customer Information</h4>
                </div>
                <div class="customer-details">
                  <div class="detail-row">
                    <div class="detail-label">Customer Name</div>
                    <div class="detail-value">{{ activeOrder?.recipientName || 'N/A' }}</div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-label">Phone Number</div>
                    <div class="detail-value">{{ activeOrder?.recipientPhone || 'N/A' }}</div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-label">Email Address</div>
                    <div class="detail-value">{{ activeOrder?.user?.email || 'N/A' }}</div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-label">Delivery Address</div>
                    <div class="detail-value address-text">{{ activeOrder?.deliveryAddress || 'N/A' }}</div>
                  </div>
                </div>
              </div>

              <!-- Order Summary Card -->
              <div class="info-card">
                <div class="card-header">
                  <h4>Order Summary</h4>
                </div>
                <div class="order-summary">
                  <div class="summary-row">
                    <div class="summary-label">Items Total</div>
                    <div class="summary-value">₱{{ getItemsTotal(activeOrder) | number:'1.0-0' }}</div>
                  </div>
                  <div class="summary-row">
                    <div class="summary-label">Shipping Fee</div>
                    <div class="summary-value">₱{{ getShippingFee(activeOrder) | number:'1.0-0' }}</div>
                  </div>
                  <div class="summary-row total-row">
                    <div class="summary-label">Total Amount</div>
                    <div class="summary-value">₱{{ grandTotal(activeOrder) | number:'1.0-0' }}</div>
                  </div>
                  <div class="summary-row">
                    <div class="summary-label">Payment Method</div>
                        <div class="summary-value payment-method">{{ getPaymentMethodLabel(activeOrder?.paymentMethod) }}</div>
                  </div>
                </div>
              </div>

              <!-- Waybill Proof Preview -->
              <div class="info-card" *ngIf="activeOrder?.waybillProofUrl">
                <div class="card-header">
                  <h4>Waybill Proof</h4>
                </div>
                <div class="proof-preview-section">
                  <img [src]="getFullImageUrl(activeOrder.waybillProofUrl)" alt="Waybill Proof" class="proof-image"/>
                </div>
              </div>

              <!-- Delivery Proof Preview -->
              <div class="info-card" *ngIf="activeOrder?.deliveryProofUrl">
                <div class="card-header">
                  <h4>Delivery Proof</h4>
                </div>
                <div class="proof-preview-section">
                  <img [src]="getFullImageUrl(activeOrder.deliveryProofUrl)" alt="Delivery Proof" class="proof-image"/>
                </div>
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn btn-secondary" (click)="closeModals()">Close</button>
            </div>
          </div>
        </div>

        <div class="empty" *ngIf="filtered.length===0">No orders.</div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 40px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .page-header {
      margin-bottom: 40px;
    }
    
    .page-header h1 {
      font-size: 2.5rem;
      color: white;
      margin: 0 0 8px 0;
    }
    
    .page-header p {
      color: rgba(255, 255, 255, 0.7);
      margin: 0;
    }
    
    .page-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .tabs { display: flex; gap: 24px; border-bottom: 1px solid #2a2a2a; padding-bottom: 8px; }
    .tab { background: none; border: none; color: #aaa; font-weight: 700; cursor: pointer; padding: 8px 0; }
    .tab.active { color: #fff; border-bottom: 2px solid #f39c12; }

    .orders-table-container {
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
    
    .order-count {
      color: white;
      font-weight: 600;
      font-size: 1.1rem;
    }
    
    .table-subtitle {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.9rem;
    }
    
    .table-wrapper {
      overflow-x: auto;
      width: 100%;
      display: block;
    }
    
    .orders-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: auto;
      min-width: 800px;
      display: table;
    }
    
    .orders-table th {
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.8);
      font-weight: 600;
      font-size: 0.9rem;
      text-align: left;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .orders-table td {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      vertical-align: middle;
    }
    
    .order-row:hover {
      background: rgba(255, 255, 255, 0.02);
    }
    
    .order-row:hover .btn-action {
      opacity: 1;
      visibility: visible;
    }
    
    .order-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .order-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .order-id {
      color: white;
      font-weight: 600;
      font-size: 0.95rem;
    }
    
    .order-timestamp {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.8rem;
    }
    
    .order-items {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .order-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .item-image {
      width: 40px;
      height: 40px;
      object-fit: cover;
      border-radius: 6px;
      background: #111;
      border: 1px solid #222;
    }
    
    .item-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .item-name {
      color: white;
      font-weight: 500;
      font-size: 0.9rem;
    }
    
    .item-meta {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.8rem;
    }
    
    .customer-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .customer-name {
      color: white;
      font-weight: 500;
      font-size: 0.9rem;
    }
    
    .customer-phone {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.8rem;
    }
    
    .total-amount {
      color: white;
      font-weight: 600;
      font-size: 1rem;
    }
    
    .status-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
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
    
    .action-buttons {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: center;
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
    
    .btn-ship {
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    
    .btn-ship:hover {
      background: rgba(59, 130, 246, 0.3);
      border-color: rgba(59, 130, 246, 0.5);
      transform: scale(1.05);
    }
    
    .btn-delivered {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    
    .btn-delivered:hover {
      background: rgba(34, 197, 94, 0.3);
      border-color: rgba(34, 197, 94, 0.5);
      transform: scale(1.05);
    }
    
    .btn-view {
      background: rgba(107, 114, 128, 0.2);
      color: #6b7280;
      border: 1px solid rgba(107, 114, 128, 0.3);
    }
    
    .btn-view:hover {
      background: rgba(107, 114, 128, 0.3);
      border-color: rgba(107, 114, 128, 0.5);
      transform: scale(1.05);
    }
    
    .empty { text-align: center; color: #888; margin-top: 20px; }

    /* Modal styles */
    .modal-backdrop { 
      position: fixed; 
      inset: 0; 
      background: rgba(0,0,0,0.8); 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      z-index: 1000; 
      backdrop-filter: blur(4px);
    }
    
    .modal { 
      width: 800px; 
      max-width: 95vw;
      max-height: 85vh;
      background: #1a1a1a; 
      border: 1px solid rgba(255, 255, 255, 0.1); 
      border-radius: 16px; 
      overflow: hidden;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.02);
    }
    
    .modal-header h3 {
      margin: 0;
      color: #fff;
      font-size: 1.5rem;
      font-weight: 600;
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
    
    .modal-body { 
      padding: 20px 24px;
      display: flex; 
      flex-direction: column; 
      gap: 16px;
      flex: 1;
      overflow-y: auto;
      min-height: 0;
      max-height: calc(85vh - 120px);
    }
    
    .modal-body::-webkit-scrollbar {
      width: 6px;
    }
    
    .modal-body::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
    }
    
    .modal-body::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
    }
    
    .modal-body::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    
    .info-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      overflow: hidden;
      flex-shrink: 0;
    }
    
    .card-header {
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.05);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 0;
    }
    
    .card-header h4 {
      margin: 0;
      color: white;
      font-size: 1rem;
      font-weight: 600;
    }
    
    .order-items-list {
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .order-item-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      margin-bottom: 6px;
    }
    
    .order-item-card .item-image {
      width: 50px;
      height: 50px;
      border-radius: 6px;
      object-fit: cover;
      border: 1px solid rgba(255, 255, 255, 0.1);
      flex-shrink: 0;
    }
    
    .item-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .item-name {
      color: white;
      font-weight: 500;
      font-size: 0.9rem;
      margin-bottom: 4px;
      line-height: 1.2;
    }
    
    .item-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    .sku-badge, .variant-badge, .quantity-badge {
      background: rgba(255, 140, 0, 0.2);
      color: #ff8c00;
      padding: 3px 6px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .sku-badge {
      background: rgba(107, 114, 128, 0.2);
      color: #6b7280;
    }
    
    .quantity-badge {
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
    }
    
    .item-price {
      color: #f39c12;
      font-size: 1rem;
      font-weight: 600;
      margin-top: 4px;
    }
    
    .customer-details {
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .detail-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .detail-label {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.8rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .detail-value {
      color: white;
      font-size: 0.9rem;
      font-weight: 500;
      line-height: 1.3;
    }
    
    .address-text {
      line-height: 1.4;
      word-break: break-word;
      white-space: normal;
      overflow-wrap: break-word;
      hyphens: auto;
    }
    
    .upload-section {
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-height: auto;
    }
    
    .file-upload-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(59, 130, 246, 0.1);
      border: 2px dashed rgba(59, 130, 246, 0.3);
      border-radius: 6px;
      color: #3b82f6;
      cursor: pointer;
      transition: all 0.2s ease;
      font-weight: 500;
      font-size: 0.9rem;
    }
    
    .file-upload-btn:hover {
      background: rgba(59, 130, 246, 0.2);
      border-color: rgba(59, 130, 246, 0.5);
    }
    
    .file-upload-btn input {
      display: none;
    }
    
    .file-preview {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 6px;
      color: #22c55e;
      font-size: 0.8rem;
      font-weight: 500;
      margin-top: 8px;
      flex-shrink: 0;
    }
    
    .file-info {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .image-preview {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-top: 8px;
    }
    
    .preview-image {
      max-width: 100%;
      max-height: 200px;
      object-fit: contain;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
    
    .file-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      justify-content: center;
    }
    
    .btn-replace {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 6px;
      color: #3b82f6;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.85rem;
      font-weight: 500;
    }
    
    .btn-replace:hover {
      background: rgba(59, 130, 246, 0.2);
      border-color: rgba(59, 130, 246, 0.5);
    }
    
    .btn-replace input {
      display: none;
    }
    
    .btn-remove {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 6px;
      color: #ef4444;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.85rem;
      font-weight: 500;
    }
    
    .btn-remove:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.5);
    }
    
    .order-summary {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
    }
    
    .summary-label {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.9rem;
      font-weight: 500;
    }
    
    .summary-value {
      color: white;
      font-size: 0.9rem;
      font-weight: 600;
    }
    
    .total-row {
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 12px;
      margin-top: 4px;
    }
    
    .total-row .summary-label {
      color: white;
      font-size: 1rem;
      font-weight: 600;
    }
    
    .total-row .summary-value {
      color: #f39c12;
      font-size: 1.1rem;
      font-weight: 700;
    }
    
    .payment-method {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    
    .proof-preview-section {
      padding: 16px;
      display: flex;
      justify-content: center;
      align-items: center;
      background: rgba(255, 255, 255, 0.02);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .proof-image {
      max-width: 400px;
      max-height: 300px;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: block;
      margin: 0 auto;
    }
    
    .no-proof-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 24px;
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.9rem;
    }
    
    .no-proof-message svg {
      color: rgba(255, 255, 255, 0.4);
    }
    
    .modal-actions { 
      display: flex; 
      justify-content: flex-end; 
      gap: 10px; 
      padding: 16px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.02);
    }
    
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9rem;
    }
    
    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
      border: none;
    }
    
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
  `]
})
export class OrdersComponent implements OnInit, OnDestroy {
  orders: any[] = [];
  tab: 'ALL' | 'TO_SHIP' | 'TO_RECEIVE' | 'COMPLETED' = 'ALL';
  placeholderImg = 'data:image/svg+xml;utf8,%3Csvg xmlns%3D"http%3A//www.w3.org/2000/svg" width%3D"60" height%3D"60"/%3E';
  private pollId: any;
  shipModal = false;
  deliveredModal = false;
  completedModal = false;
  activeOrder: any = null;
  waybillFile?: File;
  waybillName = '';
  waybillPreviewUrl?: string;
  deliveryFile?: File;
  deliveryPreviewUrl?: string;

  constructor(
    private ordersService: AdminOrderService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Check for tab query parameter
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.tab = params['tab'];
      }
    });
    
    this.refresh();
    // Lightweight polling so admin updates without manual refresh
    this.pollId = setInterval(() => this.refresh(), 5000);
  }

  ngOnDestroy(): void {
    if (this.pollId) {
      clearInterval(this.pollId);
      this.pollId = null;
    }
    
    // Clean up blob URLs
    if (this.waybillPreviewUrl) {
      URL.revokeObjectURL(this.waybillPreviewUrl);
    }
    if (this.deliveryPreviewUrl) {
      URL.revokeObjectURL(this.deliveryPreviewUrl);
    }
  }

  refresh() {
    this.ordersService.getAllOrders().subscribe({
      next: (list: any[]) => {
        console.log('Admin orders loaded:', list); // Debug log
        this.orders = Array.isArray(list) ? list : [];
      },
      error: (error: any) => {
        console.error('Error loading orders:', error);
        this.orders = [];
      }
    });
  }

  setTab(t: 'ALL' | 'TO_SHIP' | 'TO_RECEIVE' | 'COMPLETED') { this.tab = t; this.refresh(); }

  get filtered(): any[] {
    if (!Array.isArray(this.orders)) return [];
    if (this.tab === 'ALL') return this.orders;
    if (this.tab === 'TO_SHIP') return this.orders.filter(o => o.status === 'PENDING');
    if (this.tab === 'TO_RECEIVE') return this.orders.filter(o => o.status === 'SHIPPED');
    return this.orders.filter(o => o.status === 'DELIVERED');
  }

  // display helpers
  itemsTotal(o: any): number { return Number(o?.totalPrice || 0); }
  shippingFee(o: any): number { const i = this.itemsTotal(o); return i < 1000 ? 30 : 0; }
  grandTotal(o: any): number { return this.itemsTotal(o) + this.shippingFee(o); }
  statusLabel(s: string): string { 
    switch(s) {
      case 'PENDING': return 'PENDING';
      case 'CONFIRMED': return 'CONFIRMED';
      case 'SHIPPED': return 'OUT FOR DELIVERY';
      case 'DELIVERED': return 'DELIVERED';
      case 'CANCELLED': return 'CANCELLED';
      default: return s;
    }
  }

  markOutForDelivery(o: any) {
    this.ordersService.updateOrderStatus(o.id, 'SHIPPED').subscribe(resp => {
      o.status = 'SHIPPED';
      this.refresh();
    });
  }

  markDelivered(o: any) {
    this.ordersService.updateOrderStatus(o.id, 'DELIVERED').subscribe(resp => {
      o.status = 'DELIVERED';
      this.refresh();
    });
  }

  // Modal flows
  openShipModal(o: any) { 
    this.activeOrder = o; 
    this.shipModal = true; 
    this.waybillFile = undefined; 
    this.waybillName = ''; 
  }
  
  openDeliveredModal(o: any) { 
    this.activeOrder = o; 
    this.deliveredModal = true; 
  }
  
  openCompletedModal(o: any) { 
    this.activeOrder = o; 
    this.completedModal = true; 
  }
  
  closeModals() { 
    this.shipModal = false; 
    this.deliveredModal = false; 
    this.completedModal = false;
    this.activeOrder = null; 
    
    // Clean up blob URLs
    if (this.waybillPreviewUrl) {
      URL.revokeObjectURL(this.waybillPreviewUrl);
    }
    if (this.deliveryPreviewUrl) {
      URL.revokeObjectURL(this.deliveryPreviewUrl);
    }
    
    this.waybillFile = undefined;
    this.waybillName = '';
    this.waybillPreviewUrl = undefined;
    this.deliveryFile = undefined;
    this.deliveryPreviewUrl = undefined;
  }
  
  onWaybillSelected(evt: any) {
    const f = evt?.target?.files?.[0];
    if (f) {
      // Clean up previous blob URL
      if (this.waybillPreviewUrl) {
        URL.revokeObjectURL(this.waybillPreviewUrl);
      }
      this.waybillFile = f;
      this.waybillName = f.name;
      this.waybillPreviewUrl = URL.createObjectURL(f);
    }
  }
  
  onDeliveryProofSelected(evt: any) { 
    const f = evt?.target?.files?.[0]; 
    if (f) { 
      // Clean up previous blob URL
      if (this.deliveryPreviewUrl) {
        URL.revokeObjectURL(this.deliveryPreviewUrl);
      }
      this.deliveryFile = f; 
      this.deliveryPreviewUrl = URL.createObjectURL(f);
    } 
  }
  
  confirmOutForDelivery() { 
    if (this.waybillFile && this.activeOrder) {
      this.ordersService.uploadWaybillProof(this.activeOrder.id, this.waybillFile).subscribe(resp => {
        if (resp.success) {
          this.activeOrder.status = 'SHIPPED';
          // Update waybill proof URL in local order data
          if (resp.waybillUrl) {
            this.activeOrder.waybillProofUrl = resp.waybillUrl;
          }
          this.closeModals();
          this.refresh();
        }
      });
    }
  }
  
  confirmDelivered() {
    if (this.deliveryFile && this.activeOrder) {
      this.ordersService.uploadDeliveryProof(this.activeOrder.id, this.deliveryFile).subscribe(resp => {
        if (resp.success) {
          this.activeOrder.status = 'DELIVERED';
          // Update delivery proof URL in local order data
          if (resp.deliveryUrl) {
            this.activeOrder.deliveryProofUrl = resp.deliveryUrl;
          }
          this.closeModals();
          this.refresh();
        }
      });
    }
  }

  getImagePreview(file: File): string {
    return URL.createObjectURL(file);
  }

  removeWaybillFile() {
    if (this.waybillPreviewUrl) {
      URL.revokeObjectURL(this.waybillPreviewUrl);
    }
    this.waybillFile = undefined;
    this.waybillName = '';
    this.waybillPreviewUrl = undefined;
  }

  removeDeliveryFile() {
    if (this.deliveryPreviewUrl) {
      URL.revokeObjectURL(this.deliveryPreviewUrl);
    }
    this.deliveryFile = undefined;
    this.deliveryPreviewUrl = undefined;
  }

  getItemsTotal(order: any): number {
    if (!order || !order.items) return 0;
    return order.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  }

  getShippingFee(order: any): number {
    const itemsTotal = this.getItemsTotal(order);
    return itemsTotal < 1000 ? 30 : 0;
  }

  getFullImageUrl(url: string): string {
    if (!url) return '';
    // If URL already has protocol, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // If URL starts with /, prepend backend URL
    if (url.startsWith('/')) {
      return 'http://localhost:8080' + url;
    }
    // Otherwise, assume it's a relative path and prepend backend URL
    return 'http://localhost:8080/' + url;
  }

  getPaymentMethodLabel(paymentMethod: string): string {
    if (!paymentMethod) return 'Cash on Delivery (COD)';
    switch (paymentMethod.toUpperCase()) {
      case 'COD':
        return 'Cash on Delivery (COD)';
      case 'GCASH':
        return 'GCash';
      default:
        return paymentMethod;
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

}