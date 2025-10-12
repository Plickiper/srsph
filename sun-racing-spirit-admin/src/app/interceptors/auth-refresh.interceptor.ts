import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { AdminAuthService } from '../services/admin-auth.service';

@Injectable()
export class AuthRefreshInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private authService: AdminAuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          // Check if this is a token refresh request to avoid infinite loop
          if (request.url.includes('/admin/refresh-token')) {
            // If refresh token also fails, logout user
            this.authService.logout().subscribe();
            return throwError(() => error);
          }

          // If we're already refreshing, wait for the new token
          if (this.isRefreshing) {
            return this.refreshTokenSubject.pipe(
              filter(result => result !== null),
              take(1),
              switchMap(() => next.handle(this.addTokenToRequest(request)))
            );
          }

          // Start token refresh process
          this.isRefreshing = true;
          this.refreshTokenSubject.next(null);

          return this.authService.refreshToken().pipe(
            switchMap((response) => {
              this.isRefreshing = false;
              this.refreshTokenSubject.next(response);
              return next.handle(this.addTokenToRequest(request));
            }),
            catchError((refreshError) => {
              this.isRefreshing = false;
              this.refreshTokenSubject.next(null);
              // If refresh fails, logout user
              this.authService.logout().subscribe();
              return throwError(() => refreshError);
            })
          );
        }

        return throwError(() => error);
      })
    );
  }

  private addTokenToRequest(request: HttpRequest<any>): HttpRequest<any> {
    const token = localStorage.getItem('admin_token');
    if (token) {
      return request.clone({
        setHeaders: {
          'Authorization': `Bearer ${token}`
        }
      });
    }
    return request;
  }
}


