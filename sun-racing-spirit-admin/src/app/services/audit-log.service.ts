import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminAuthService } from './admin-auth.service';

export interface AuditLog {
  id: number;
  timestamp: string;
  actorId: number;
  actorName: string;
  actorEmail: string;
  action: string;
  resourceType: 'USER' | 'PRODUCT' | 'ORDER' | 'SYSTEM';
  resourceId: number;
  resourceName: string;
  description: string;
  ipAddress: string;
  userAgent: string;
  actionType: 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'TERMINATE' | 'REACTIVATE' | 'VIEW' | 'EXPORT' | 'SYSTEM_EVENT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface AuditLogResponse {
  success: boolean;
  auditLogs: AuditLog[];
  currentPage: number;
  totalItems: number;
  totalPages: number;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {
  private apiUrl = 'http://localhost:8080/api/admin/audit-logs';

  constructor(private http: HttpClient, private authService: AdminAuthService) { }

  private getAuthHeaders(): HttpHeaders {
    const user = this.authService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    return new HttpHeaders({
      'Admin-Role': user.role
    });
  }

  getAuditLogs(
    page: number = 0,
    size: number = 20,
    sort: string = 'timestamp,desc'
  ): Observable<AuditLogResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    const headers = this.getAuthHeaders();
    return this.http.get<AuditLogResponse>(this.apiUrl, { params, headers });
  }
}