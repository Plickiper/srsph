import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminAuthService, AdminUser, CreateStaffRequest, UpdateStaffRequest } from '../../services/admin-auth.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Staff Management</h1>
          <p>Manage admin staff accounts and permissions</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="openCreateModal()" [disabled]="loading">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            Add Staff Member
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading staff members...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error && !loading" class="error-container">
        <div class="error-icon">⚠️</div>
        <h3>Unable to Load Staff Data</h3>
        <p>{{ error }}</p>
        <button class="btn btn-primary" (click)="loadStaffMembers()">Try Again</button>
      </div>

      <!-- Staff List -->
      <div *ngIf="!loading && !error" class="staff-table-container">
        <div class="table-header">
          <div class="table-title">Staff Members</div>
          <div class="table-count">{{ staffMembers.length }} member{{ staffMembers.length !== 1 ? 's' : '' }}</div>
        </div>
        
        <div class="staff-table">
          <div class="table-row header">
            <div class="col-user">User</div>
            <div class="col-role">Role</div>
            <div class="col-status">Status</div>
            <div class="col-last-login">Last Login</div>
            <div class="col-actions">Actions</div>
          </div>
          
          <div class="table-row" *ngFor="let user of staffMembers" [class.inactive]="!user.isActive">
            <div class="col-user">
              <div class="user-info">
                <div class="user-avatar">
                  {{ getInitials(user.firstName, user.lastName) }}
                </div>
                <div class="user-details">
                  <div class="user-name">{{ user.firstName }} {{ user.lastName }}</div>
                  <div class="user-email">{{ user.email }}</div>
                </div>
              </div>
            </div>
            
            <div class="col-role">
              <span class="role-badge" [class.super-admin]="user.role === 'SUPER_ADMIN'">
                {{ user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Staff' }}
              </span>
            </div>
            
            <div class="col-status">
              <div class="status-container">
                <span class="status-badge" [class.active]="user.isActive" [class.inactive]="!user.isActive">
                  {{ user.isActive ? 'Active' : 'Inactive' }}
                </span>
                <span *ngIf="user.isActive" class="online-indicator" [class.online]="isUserOnline(user)" [class.offline]="!isUserOnline(user)">
                  <div class="status-dot"></div>
                  {{ isUserOnline(user) ? 'Online' : 'Offline' }}
                </span>
              </div>
            </div>
            
            <div class="col-last-login">
              <span class="last-login">{{ user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never' }}</span>
            </div>
            
            <div class="col-actions" *ngIf="user.role !== 'SUPER_ADMIN' || canDeleteSuperAdmin(user)">
              <div class="action-buttons">
                <button class="btn-icon" (click)="openEditModal(user)" title="Edit">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button class="btn-icon danger" (click)="confirmDelete(user)" [disabled]="deletingUserId === user.id" title="Terminate Account">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="staffMembers.length === 0" class="empty-state">
          <div class="empty-icon">👥</div>
          <h3>No Staff Members</h3>
          <p>Add your first staff member to get started</p>
          <button class="btn btn-primary" (click)="openCreateModal()">Add Staff Member</button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
      <div class="modal-content modern" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="modal-title-section">
            <div class="modal-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
            </div>
            <div>
              <h2>{{ editingUser ? 'Edit Staff Member' : 'Add New Staff Member' }}</h2>
              <p>{{ editingUser ? 'Update staff member information' : 'Create a new staff account' }}</p>
            </div>
          </div>
          <button class="modal-close" (click)="closeModal()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <form (ngSubmit)="onSubmit()" #staffForm="ngForm" class="modal-form">
          <div class="form-sections">
            <!-- Personal Information Section -->
            <div class="form-section">
              <div class="section-header">
                <div class="section-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <h3>Personal Information</h3>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="firstName" class="form-label">First Name *</label>
                  <input 
                    type="text" 
                    id="firstName"
                    name="firstName"
                    class="form-input" 
                    [(ngModel)]="formData.firstName"
                    required
                    #firstNameInput="ngModel"
                    placeholder="Enter first name"
                  >
                  <div *ngIf="firstNameInput.invalid && firstNameInput.touched" class="error-message">
                    First name is required
                  </div>
                </div>

                <div class="form-group">
                  <label for="lastName" class="form-label">Last Name *</label>
                  <input 
                    type="text" 
                    id="lastName"
                    name="lastName"
                    class="form-input" 
                    [(ngModel)]="formData.lastName"
                    required
                    #lastNameInput="ngModel"
                    placeholder="Enter last name"
                  >
                  <div *ngIf="lastNameInput.invalid && lastNameInput.touched" class="error-message">
                    Last name is required
                  </div>
                </div>
              </div>
            </div>

            <!-- Account Information Section -->
            <div class="form-section">
              <div class="section-header">
                <div class="section-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4"></path>
                    <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
                    <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
                  </svg>
                </div>
                <h3>Account Information</h3>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="username" class="form-label">Username *</label>
                  <input 
                    type="text" 
                    id="username"
                    name="username"
                    class="form-input" 
                    [(ngModel)]="formData.username"
                    required
                    minlength="3"
                    #usernameInput="ngModel"
                    placeholder="Choose a username"
                  >
                  <div *ngIf="usernameInput.invalid && usernameInput.touched" class="error-message">
                    <span *ngIf="usernameInput.errors?.['required']">Username is required</span>
                    <span *ngIf="usernameInput.errors?.['minlength']">Username must be at least 3 characters</span>
                  </div>
                </div>

                <div class="form-group">
                  <label for="email" class="form-label">Email *</label>
                  <input 
                    type="email" 
                    id="email"
                    name="email"
                    class="form-input" 
                    [(ngModel)]="formData.email"
                    required
                    email
                    #emailInput="ngModel"
                    placeholder="Enter email address"
                  >
                  <div *ngIf="emailInput.invalid && emailInput.touched" class="error-message">
                    <span *ngIf="emailInput.errors?.['required']">Email is required</span>
                    <span *ngIf="emailInput.errors?.['email']">Please enter a valid email</span>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label for="phoneNumber" class="form-label">Phone Number</label>
                <input 
                  type="tel" 
                  id="phoneNumber"
                  name="phoneNumber"
                  class="form-input" 
                  [(ngModel)]="formData.phoneNumber"
                  placeholder="Enter phone number (optional)"
                >
              </div>

              <div class="form-group" *ngIf="!editingUser">
                <label for="password" class="form-label">Password *</label>
                <input 
                  type="password" 
                  id="password"
                  name="password"
                  class="form-input" 
                  [(ngModel)]="formData.password"
                  required
                  minlength="6"
                  #passwordInput="ngModel"
                  placeholder="Enter password (min 6 characters)"
                >
                <div *ngIf="passwordInput.invalid && passwordInput.touched" class="error-message">
                  <span *ngIf="passwordInput.errors?.['required']">Password is required</span>
                  <span *ngIf="passwordInput.errors?.['minlength']">Password must be at least 6 characters</span>
                </div>
              </div>

              <div class="form-group" *ngIf="editingUser">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.isActive"
                    name="isActive"
                  >
                  <span class="checkmark"></span>
                  <span class="checkbox-text">Active Account</span>
                </label>
              </div>
            </div>
          </div>

          <div *ngIf="formError" class="error-container">
            <div class="error-icon">⚠️</div>
            <p>{{ formError }}</p>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" (click)="closeModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Cancel
            </button>
            <button 
              type="submit" 
              class="btn btn-primary" 
              [disabled]="staffForm.invalid || submitting"
            >
              <span *ngIf="submitting" class="spinner"></span>
              <svg *ngIf="!submitting" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
              {{ submitting ? 'Saving...' : (editingUser ? 'Update Staff Member' : 'Create Staff Member') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Deactivate Confirmation Modal -->
    <div class="modal-overlay" *ngIf="showDeleteModal" (click)="cancelDelete()">
      <div class="modal-content small" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="modal-title-section">
            <div class="modal-icon danger">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </div>
            <div>
              <h2>Terminate Account</h2>
              <p>Disable staff member access</p>
            </div>
          </div>
          <button class="modal-close" (click)="cancelDelete()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="delete-warning">
            <div class="warning-icon">⚠️</div>
            <div class="warning-content">
              <h3>Are you sure you want to terminate this account?</h3>
              <p><strong>{{ userToDelete?.firstName }} {{ userToDelete?.lastName }}</strong> will be permanently removed from the system.</p>
              <ul class="delete-effects">
                <li>Account will be permanently deleted</li>
                <li>All data will be removed from database</li>
                <li>This action cannot be undone</li>
                <li>User will be completely removed from system</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" (click)="cancelDelete()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Cancel
          </button>
          <button 
            type="button" 
            class="btn btn-danger" 
            (click)="deleteUser()"
            [disabled]="deletingUserId === userToDelete?.id"
          >
            <span *ngIf="deletingUserId === userToDelete?.id" class="spinner"></span>
            <svg *ngIf="deletingUserId !== userToDelete?.id" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3,6 5,6 21,6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            {{ deletingUserId === userToDelete?.id ? 'Terminating...' : 'Terminate Account' }}
          </button>
        </div>
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
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
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
    
    /* Table Styles */
    .staff-table-container {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      overflow: hidden;
    }
    
    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      background: rgba(255, 255, 255, 0.05);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .table-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: white;
    }
    
    .table-count {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.9rem;
    }
    
    .staff-table {
      display: flex;
      flex-direction: column;
    }
    
    .table-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1.5fr 1fr;
      gap: 16px;
      padding: 16px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      transition: background-color 0.2s ease;
    }
    
    .table-row:hover {
      background: rgba(255, 255, 255, 0.03);
    }
    
    .table-row.header {
      background: rgba(255, 255, 255, 0.08);
      font-weight: 600;
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .table-row.inactive {
      opacity: 0.6;
    }
    
    /* User Column */
    .col-user {
      display: flex;
      align-items: center;
    }
    
    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ff8c00, #ffb347);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 0.9rem;
    }
    
    .user-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .user-name {
      color: white;
      font-weight: 500;
      font-size: 0.95rem;
    }
    
    .user-email {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.85rem;
    }
    
    /* Role Column */
    .col-role {
      display: flex;
      align-items: center;
    }
    
    .role-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 500;
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.8);
    }
    
    .role-badge.super-admin {
      background: linear-gradient(135deg, #ff8c00, #ffb347);
      color: white;
    }
    
    /* Status Column */
    .col-status {
      display: flex;
      align-items: center;
    }
    
    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    
    .status-badge.active {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }
    
    .status-badge.inactive {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
    
    /* Last Login Column */
    .col-last-login {
      display: flex;
      align-items: center;
    }
    
    .last-login {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.9rem;
    }
    
    /* Actions Column */
    .col-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }
    
    .action-buttons {
      display: flex;
      gap: 8px;
    }
    
    .btn-icon {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .btn-icon:hover {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }
    
    .btn-icon.danger:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
    
    .btn-icon.warning {
      color: #f59e0b;
    }
    
    .btn-icon.warning:hover {
      background: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
    }
    
    .btn-icon:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    /* Status Container */
    .status-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .online-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    
    .online-indicator.online {
      color: #22c55e;
    }
    
    .online-indicator.offline {
      color: rgba(255, 255, 255, 0.5);
    }
    
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }
    
    .online-indicator.online .status-dot {
      background: #22c55e;
      box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
    }
    
    .online-indicator.offline .status-dot {
      background: rgba(255, 255, 255, 0.5);
    }
    
    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: rgba(255, 255, 255, 0.6);
    }
    
    .empty-icon {
      font-size: 3rem;
      margin-bottom: 16px;
    }
    
    .empty-state h3 {
      color: white;
      margin: 0 0 8px 0;
      font-size: 1.5rem;
    }
    
    .empty-state p {
      margin: 0 0 24px 0;
    }
    
    /* Loading and Error States */
    .loading-container, .error-container {
      text-align: center;
      padding: 60px 20px;
    }
    
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 140, 0, 0.3);
      border-radius: 50%;
      border-top-color: #ff8c00;
      animation: spin 1s ease-in-out infinite;
      margin: 0 auto 20px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .error-container {
      background: rgba(239, 68, 68, 0.05);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 12px;
    }
    
    .error-icon {
      font-size: 3rem;
      margin-bottom: 16px;
    }
    
    .error-container h3 {
      color: #ef4444;
      margin: 0 0 8px 0;
    }
    
    .error-container p {
      color: rgba(255, 255, 255, 0.7);
      margin: 0 0 20px 0;
    }
    
    /* Buttons */
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
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
    
    .btn-danger {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    
    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.3);
    }
    
    .btn-warning {
      background: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    
    .btn-warning:hover {
      background: rgba(245, 158, 11, 0.3);
    }
    
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    /* Warning Content Styles */
    .terminate-warning, .delete-warning {
      display: flex;
      gap: 16px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      margin-bottom: 20px;
    }
    
    .warning-icon {
      font-size: 2rem;
      flex-shrink: 0;
    }
    
    .warning-content h3 {
      color: white;
      margin: 0 0 8px 0;
      font-size: 1.1rem;
    }
    
    .warning-content p {
      color: rgba(255, 255, 255, 0.8);
      margin: 0 0 16px 0;
      line-height: 1.5;
    }
    
    .terminate-effects, .delete-effects {
      margin: 0;
      padding-left: 20px;
      color: rgba(255, 255, 255, 0.7);
    }
    
    .terminate-effects li, .delete-effects li {
      margin-bottom: 4px;
    }
    
    /* Modal Styles */
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
    }
    
    .modal-content {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
    }
    
    .modal-content.modern {
      max-width: 600px;
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      border: 1px solid rgba(255, 140, 0, 0.2);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }
    
    .modal-content.small {
      max-width: 400px;
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .modal-title-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .modal-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, #ff8c00, #ffb347);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    
    .modal-icon.warning {
      background: linear-gradient(135deg, #f59e0b, #fbbf24);
    }
    
    .modal-icon.danger {
      background: linear-gradient(135deg, #ef4444, #f87171);
    }
    
    .modal-header h2 {
      color: white;
      margin: 0 0 4px 0;
      font-size: 1.5rem;
      font-weight: 600;
    }
    
    .modal-header p {
      color: rgba(255, 255, 255, 0.7);
      margin: 0;
      font-size: 0.9rem;
    }
    
    .modal-close {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.7);
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .modal-close:hover {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }
    
    .modal-form {
      padding: 24px;
    }
    
    .form-sections {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    
    .form-section {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 24px;
    }
    
    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .section-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(255, 140, 0, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ff8c00;
    }
    
    .section-header h3 {
      color: white;
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    
    .modal-body {
      padding: 24px;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-label {
      display: block;
      margin-bottom: 8px;
      color: white;
      font-weight: 500;
    }
    
    .form-input {
      width: 100%;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      color: white;
      font-size: 0.9rem;
      transition: all 0.2s ease;
    }
    
    .form-input:focus {
      outline: none;
      border-color: #ff8c00;
      box-shadow: 0 0 0 3px rgba(255, 140, 0, 0.2);
      background: rgba(255, 255, 255, 0.08);
    }
    
    .form-input::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }
    
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 12px;
      color: white;
      cursor: pointer;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      transition: all 0.2s ease;
    }
    
    .checkbox-label:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    
    .checkbox-text {
      font-weight: 500;
    }
    
    .error-message {
      color: #ef4444;
      font-size: 0.8rem;
      margin-top: 4px;
    }
    
    .error-container {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
    }
    
    .error-container p {
      margin: 0;
      color: #ef4444;
    }
    
    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .warning-text {
      color: #fbbf24;
      font-size: 0.9rem;
      margin-top: 8px;
    }
    
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 0.8s linear infinite;
    }
  `]
})
export class UsersComponent implements OnInit {
  staffMembers: AdminUser[] = [];
  loading = true;
  error = '';
  
  // Modal state
  showModal = false;
  showDeleteModal = false;
  editingUser: AdminUser | null = null;
  userToDelete: AdminUser | null = null;
  submitting = false;
  deletingUserId: number | null = null;
  formError = '';
  
  // Form data
  formData: any = {
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phoneNumber: '',
    password: '',
    isActive: true
  };

  constructor(private authService: AdminAuthService) {}

  ngOnInit(): void {
    this.loadStaffMembers();
    
    // Refresh staff list every 30 seconds to update online status (only if page is visible)
    setInterval(() => {
      if (!document.hidden) {
        this.loadStaffMembers();
      }
    }, 30000);
  }

  loadStaffMembers(): void {
    this.loading = true;
    this.error = '';
    
    this.authService.getAllStaff().subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          // Sort to put Super Admin first, then by name
          this.staffMembers = response.users.sort((a, b) => {
            if (a.role === 'SUPER_ADMIN' && b.role !== 'SUPER_ADMIN') return -1;
            if (b.role === 'SUPER_ADMIN' && a.role !== 'SUPER_ADMIN') return 1;
            return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          });
        } else {
          this.error = response.error || 'Failed to load staff members';
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error loading staff:', error);
        
        if (error.status === 403) {
          this.error = 'Access denied. Super Admin privileges required.';
        } else if (error.status === 0) {
          this.error = 'Unable to connect to server. Please try again later.';
        } else {
          this.error = 'Failed to load staff members. Please try again.';
        }
      }
    });
  }

  openCreateModal(): void {
    this.editingUser = null;
    this.formData = {
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      phoneNumber: '',
      password: '',
      isActive: true
    };
    this.formError = '';
    this.showModal = true;
  }

  openEditModal(user: AdminUser): void {
    this.editingUser = user;
    this.formData = {
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username, // Add username field
      email: user.email,
      phoneNumber: user.phoneNumber || '',
      isActive: user.isActive
    };
    this.formError = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingUser = null;
    this.formError = '';
    this.submitting = false;
  }

  onSubmit(): void {
    if (this.submitting) return;

    this.submitting = true;
    this.formError = '';

    if (this.editingUser) {
      // Update existing staff
      const updateData: UpdateStaffRequest = {
        firstName: this.formData.firstName,
        lastName: this.formData.lastName,
        email: this.formData.email,
        phoneNumber: this.formData.phoneNumber || undefined,
        isActive: this.formData.isActive
      };

      this.authService.updateStaff(this.editingUser.id, updateData).subscribe({
        next: (response) => {
          this.submitting = false;
          if (response.success && response.user) {
            // Update the user in the list
            const index = this.staffMembers.findIndex(u => u.id === this.editingUser!.id);
            if (index !== -1) {
              this.staffMembers[index] = response.user;
            }
            this.closeModal();
          } else {
            this.formError = response.error || 'Failed to update staff member';
          }
        },
        error: (error) => {
          this.submitting = false;
          this.handleFormError(error);
        }
      });
    } else {
      // Create new staff
      const createData: CreateStaffRequest = {
        username: this.formData.username,
        email: this.formData.email,
        password: this.formData.password,
        firstName: this.formData.firstName,
        lastName: this.formData.lastName,
        phoneNumber: this.formData.phoneNumber || undefined
      };

      this.authService.createStaff(createData).subscribe({
        next: (response) => {
          this.submitting = false;
          if (response.success && response.user) {
            this.staffMembers.push(response.user);
            this.closeModal();
          } else {
            this.formError = response.error || 'Failed to create staff member';
          }
        },
        error: (error) => {
          this.submitting = false;
          this.handleFormError(error);
        }
      });
    }
  }

  confirmDelete(user: AdminUser): void {
    this.userToDelete = user;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.userToDelete = null;
  }

  deleteUser(): void {
    if (!this.userToDelete || this.deletingUserId === this.userToDelete.id) return;

    this.deletingUserId = this.userToDelete.id;

    // Use the terminate endpoint for permanent deletion
    this.authService.terminateStaff(this.userToDelete.id).subscribe({
      next: (response) => {
        this.deletingUserId = null;
        if (response.success) {
          // Remove the user from the list permanently
          this.staffMembers = this.staffMembers.filter(u => u.id !== this.userToDelete!.id);
          this.cancelDelete();
          alert('Staff member terminated permanently');
        } else {
          alert(response.error || 'Failed to terminate staff member');
        }
      },
      error: (error) => {
        this.deletingUserId = null;
        console.error('Error terminating staff:', error);
        
        let errorMessage = 'Failed to terminate staff member. Please try again.';
        
        if (error.status === 400) {
          errorMessage = 'Invalid request data. Please check the staff information.';
        } else if (error.status === 403) {
          errorMessage = 'Access denied. Super Admin privileges required.';
        } else if (error.status === 404) {
          errorMessage = 'Staff member not found.';
        } else if (error.status === 0) {
          errorMessage = 'Unable to connect to server. Please try again later.';
        } else if (error.status === 500) {
          errorMessage = 'Server error occurred. Please try again later.';
        }

        alert(errorMessage);
      }
    });
  }

  canDeleteSuperAdmin(user: AdminUser): boolean {
    if (user.role !== 'SUPER_ADMIN') return true;
    const superAdminCount = this.staffMembers.filter(u => u.role === 'SUPER_ADMIN').length;
    return superAdminCount > 1;
  }

  getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  private handleFormError(error: any): void {
    if (error.status === 409) {
      this.formError = 'Username or email already exists';
    } else if (error.status === 403) {
      this.formError = 'Access denied. Super Admin privileges required.';
    } else if (error.status === 0) {
      this.formError = 'Unable to connect to server. Please try again later.';
    } else {
      this.formError = 'An unexpected error occurred. Please try again.';
    }
  }

  // Online status methods
  isUserOnline(user: AdminUser): boolean {
    // Check if this is the currently logged in user
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.id === user.id) {
      return true; // Current user is always online
    }
    
    // For other users, check if they logged in recently and haven't logged out
    if (!user.lastLoginAt) return false;
    
    const lastLogin = new Date(user.lastLoginAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastLogin.getTime()) / (1000 * 60);
    
    // Consider online if logged in within last 5 minutes (shorter window for accuracy)
    return diffMinutes < 5;
  }

}