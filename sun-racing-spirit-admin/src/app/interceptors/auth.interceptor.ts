import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { SessionService } from '../services/session.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private router: Router, private sessionService: SessionService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip auth for login requests and auth-related requests
    if (req.url.includes('/auth/admin/login') || req.url.includes('/auth')) {
      // For auth requests, don't add any headers to avoid CORS issues
      return next.handle(req);
    }

    // Add auth header to requests
    const authReq = this.addAuthHeader(req);
    
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !req.url.includes('/auth')) {
          // Try to refresh token first
          return this.handleTokenRefresh(req, next);
        }
        return throwError(() => error);
      })
    );
  }

  private addAuthHeader(req: HttpRequest<any>): HttpRequest<any> {
    const token = localStorage.getItem('admin_token');
    if (token) {
      return req.clone({
        setHeaders: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    }
    return req;
  }

  private handleTokenRefresh(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return this.sessionService.refreshToken().pipe(
      switchMap(() => {
        // Retry the original request with new token
        const newAuthReq = this.addAuthHeader(req);
        return next.handle(newAuthReq);
      }),
      catchError((refreshError) => {
        // If refresh fails, clear session and redirect to login
        this.sessionService.clearSession();
        this.router.navigate(['/auth']);
        return throwError(() => refreshError);
      })
    );
  }
}