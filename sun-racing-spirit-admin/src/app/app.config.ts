import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, ErrorHandler, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { routes } from './app.routes';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { AuthRefreshInterceptor } from './interceptors/auth-refresh.interceptor';
import { GlobalErrorHandlerService } from './services/global-error-handler.service';
import { ActivityTrackerService } from './services/activity-tracker.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandlerService
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthRefreshInterceptor,
      multi: true
    },
    {
      provide: 'APP_INITIALIZER',
      useFactory: () => {
        const activityTracker = inject(ActivityTrackerService);
        return () => Promise.resolve();
      },
      multi: true
    }
  ]
};
