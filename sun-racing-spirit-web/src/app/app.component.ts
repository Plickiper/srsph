import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { NotificationComponent } from './components/notification/notification.component';
import { ProductUpdateWatcherService } from './services/product-update-watcher.service';
import { CartService } from './services/cart.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent, NotificationComponent],
  template: `
    <div class="app-container">
      <app-navbar></app-navbar>
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
      <app-footer></app-footer>
      <app-notification></app-notification>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .main-content {
      flex: 1;
    }
  `]
})
export class AppComponent implements OnInit {
  title = 'Sun Racing Spirit';

  constructor(
    private productUpdateWatcher: ProductUpdateWatcherService,
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    // Start watching for product updates globally
    this.productUpdateWatcher.startWatching();
    
    // Load appropriate cart based on authentication status
    this.cartService.loadAppropriateCart();

    // Dynamic document title per route
    this.router.events.subscribe(evt => {
      if (evt instanceof NavigationEnd) {
        const url = evt.urlAfterRedirects || evt.url;
        let page = '';
        if (url.startsWith('/cart')) page = 'Shopping Cart';
        else if (url.startsWith('/checkout')) page = 'Checkout';
        else if (url.startsWith('/orders')) page = 'Orders';
        else if (url.startsWith('/profile')) page = 'Profile';
        else if (url.startsWith('/products')) page = 'Products';
        else page = '';
        if (page) {
          this.titleService.setTitle(`${page} - Sun Racing Spirit Philippines`);
        }
      }
    });
  }
}
