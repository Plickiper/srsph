import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditLogService, AuditLog } from '../../services/audit-log.service';
import { AdminAuthService } from '../../services/admin-auth.service';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Audit Log</h1>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading recent activities...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error && !loading" class="error-container">
        <div class="error-icon">⚠️</div>
        <h3>Unable to Load Activities</h3>
        <p>{{ error }}</p>
        <button class="btn btn-primary" (click)="loadAuditLogs()">Try Again</button>
      </div>

      <!-- Activities List -->
      <div *ngIf="!loading && !error" class="activities-container">
        <div *ngIf="auditLogs.length === 0" class="empty-state">
          <div class="empty-icon">📄</div>
          <h3>No Recent Activities</h3>
          <p>Admin and staff activities will appear here.</p>
        </div>

        <div *ngIf="auditLogs.length > 0" class="activities-list">
          <div class="activity-item" *ngFor="let log of auditLogs">
            <div class="activity-icon" [class]="getActivityIconClass(log.actionType)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path *ngIf="log.actionType === 'LOGIN'" d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <path *ngIf="log.actionType === 'LOGOUT'" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <path *ngIf="log.actionType === 'CREATE'" d="M12 5v14m7-7H5"></path>
                <path *ngIf="log.actionType === 'UPDATE'" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path *ngIf="log.actionType === 'DELETE'" d="M3 6h18l-2 13H5L3 6z"></path>
                <path *ngIf="log.actionType === 'TERMINATE'" d="M18 6L6 18M6 6l12 12"></path>
                <circle *ngIf="log.actionType === 'VIEW'" cx="12" cy="12" r="3"></circle>
                <path *ngIf="!['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'TERMINATE', 'VIEW'].includes(log.actionType)" d="M9 12l2 2 4-4"></path>
              </svg>
            </div>
            <div class="activity-content">
              <div class="activity-header">
                <span class="activity-action">{{ log.action }}</span>
                <span class="activity-time">{{ formatDateTime(log.timestamp) }}</span>
              </div>
              <div class="activity-description">{{ log.description }}</div>
              <div class="activity-details">
                <span *ngIf="log.actorName" class="activity-actor">{{ log.actorName }}</span>
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
      max-width: 1000px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 40px;
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
    }

    .btn-primary {
      background: linear-gradient(135deg, #ff8c00, #ffb347);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(255, 140, 0, 0.3);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Loading State */
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

    /* Error State */
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

    /* Activities Container */
    .activities-container {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      overflow: hidden;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 80px 20px;
      color: rgba(255, 255, 255, 0.6);
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 20px;
    }

    .empty-state h3 {
      color: white;
      margin: 0 0 8px 0;
      font-size: 1.5rem;
    }

    .empty-state p {
      margin: 0;
    }

    /* Activities List */
    .activities-list {
      padding: 0;
    }

    .activity-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      transition: background 0.2s ease;
    }

    .activity-item:last-child {
      border-bottom: none;
    }

    .activity-item:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    .activity-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .activity-icon.login {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }

    .activity-icon.logout {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .activity-icon.create {
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
    }

    .activity-icon.update {
      background: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
    }

    .activity-icon.delete {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .activity-icon.terminate {
      background: rgba(139, 92, 246, 0.2);
      color: #8b5cf6;
    }

    .activity-icon.view {
      background: rgba(107, 114, 128, 0.2);
      color: #6b7280;
    }

    .activity-icon.default {
      background: rgba(255, 140, 0, 0.2);
      color: #ff8c00;
    }

    .activity-content {
      flex: 1;
      min-width: 0;
    }

    .activity-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      flex-wrap: wrap;
      gap: 8px;
    }

    .activity-action {
      font-weight: 600;
      color: white;
      font-size: 1rem;
    }

    .activity-time {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.85rem;
    }

    .activity-description {
      color: rgba(255, 255, 255, 0.8);
      margin-bottom: 8px;
      line-height: 1.4;
    }

    .activity-details {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .activity-actor {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.85rem;
      font-weight: 500;
    }

    .activity-ip {
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.8rem;
      font-family: monospace;
    }

    @media (max-width: 768px) {
      .page-container {
        padding: 20px;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .activity-item {
        padding: 16px 20px;
      }

      .activity-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .activity-details {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
    }
  `]
})
export class AuditLogComponent implements OnInit {
  auditLogs: AuditLog[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private auditLogService: AuditLogService,
    private authService: AdminAuthService
  ) {}

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  loadAuditLogs(): void {
    this.loading = true;
    this.error = null;

    this.auditLogService.getAuditLogs(0, 20, 'timestamp,desc').subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.auditLogs = response.auditLogs;
        } else {
          this.error = response.error || 'Failed to load audit logs';
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error loading audit logs:', error);
        this.error = 'Failed to load audit logs. Please try again.';
      }
    });
  }

  getActivityIconClass(actionType: string): string {
    switch (actionType) {
      case 'LOGIN': return 'login';
      case 'LOGOUT': return 'logout';
      case 'CREATE': return 'create';
      case 'UPDATE': return 'update';
      case 'DELETE': return 'delete';
      case 'TERMINATE': return 'terminate';
      case 'VIEW': return 'view';
      default: return 'default';
    }
  }

  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}