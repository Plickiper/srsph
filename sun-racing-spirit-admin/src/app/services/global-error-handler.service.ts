import { ErrorHandler, Injectable, NgZone } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandlerService implements ErrorHandler {
  
  constructor(private ngZone: NgZone) {}

  handleError(error: any): void {
    console.error('Global error caught:', error);
    
    // Run outside Angular zone to avoid infinite loops
    this.ngZone.run(() => {
      let message = 'An unexpected error occurred. Please try again.';
      
      if (error?.error?.error) {
        // Backend error with specific message
        message = error.error.error;
      } else if (error?.error?.message) {
        // Backend error with message
        message = error.error.message;
      } else if (error?.message) {
        // JavaScript error
        message = error.message;
      } else if (typeof error === 'string') {
        // String error
        message = error;
      }
      
      // For now, just log the error - you can add a notification service later
      console.error('Error message:', message);
      
      // You could also show an alert or use a toast service here
      // alert(message); // Uncomment if you want to show alerts
    });
  }
}
