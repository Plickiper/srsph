import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { NotificationComponent } from './components/notification/notification.component';
import { ProductUpdateWatcherService } from './services/product-update-watcher.service';
import { CartService } from './services/cart.service';
import { AuthService } from './services/auth.service';
import { BaseComponent } from './core/base-component';
import { LoadingComponent } from './components/loading/loading.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent, NotificationComponent, LoadingComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent extends BaseComponent implements OnInit, OnDestroy {
  title = 'Sun Racing Spirit';

  constructor(
    private productUpdateWatcher: ProductUpdateWatcherService,
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
    private titleService: Title
  ) {
    super();
  }

  ngOnInit(): void {
    // Start watching for product updates globally
    this.productUpdateWatcher.startWatching();
    
    // Load appropriate cart based on authentication status
    this.cartService.loadAppropriateCart();

    // Dynamic document title per route
    this.addSubscription(
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
      })
    );
  }

  override ngOnDestroy(): void {
    // Call parent ngOnDestroy to unsubscribe from all subscriptions
    super.ngOnDestroy();
  }
}
