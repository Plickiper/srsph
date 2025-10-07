import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="footer">
      <div class="container">
        <div class="footer-content">
          <!-- Brand Section -->
          <div class="footer-brand">
            <h3 class="brand-name">Sun Racing Spirit</h3>
            <p class="brand-description">
              A premium Taiwanese brand by Tai Yeang Accessories Co., Ltd., specializing in high-performance aftermarket parts for scooters and small motorcycles.
            </p>
            <div class="social-links">
              <a href="https://www.instagram.com/sunracingph" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="Instagram">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="https://www.facebook.com/sunracingspiritphilippines/" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="Facebook">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>
          </div>

          <!-- Quick Links -->
          <div class="footer-links">
            <h4 class="footer-title">Quick Links</h4>
            <ul class="footer-list">
              <li><a routerLink="/products" class="footer-link">All Products</a></li>
              <li><a href="#" class="footer-link">About Us</a></li>
              <li><a href="#" class="footer-link">Contact Us</a></li>
              <li><a href="#" class="footer-link">FAQ</a></li>
              <li><a href="#" class="footer-link">Privacy Policy</a></li>
              <li><a href="#" class="footer-link">Terms of Service</a></li>
            </ul>
          </div>

          <!-- Newsletter -->
          <div class="footer-newsletter">
            <h4 class="footer-title">Stay Updated</h4>
            <p class="newsletter-description">
              Get the latest drops and exclusive offers delivered to your inbox.
            </p>
            <div class="newsletter-form">
              <input 
                type="email" 
                placeholder="Enter your email" 
                class="newsletter-input"
                #emailInput
              >
              <button class="newsletter-btn" (click)="subscribeNewsletter(emailInput.value)">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <!-- Footer Bottom -->
        <div class="footer-bottom">
          <div class="footer-bottom-content">
            <p class="copyright">
              © 2025 Sun Racing Spirit Philippines. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      background: linear-gradient(145deg, #0f0f0f 0%, #1a1a1a 100%);
      border-top: 1px solid var(--gray-800);
      margin-top: 0;
    }

    .footer-content {
      display: grid;
      grid-template-columns: 2fr 1fr 1.5fr;
      gap: var(--spacing-2xl);
      padding: var(--spacing-3xl) 0;
    }

    .footer-brand {
      max-width: 300px;
    }

    .brand-name {
      font-family: var(--font-secondary);
      font-size: 1.5rem;
      font-weight: 900;
      background: linear-gradient(135deg, var(--sun-orange-yellow), var(--sun-yellow));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: var(--spacing-md);
    }

    .brand-description {
      color: var(--gray-400);
      font-size: 0.875rem;
      line-height: 1.6;
      margin-bottom: var(--spacing-lg);
    }

    .social-links {
      display: flex;
      gap: var(--spacing-md);
    }

    .social-link {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: var(--gray-800);
      border-radius: 50%;
      color: var(--gray-400);
      transition: all var(--transition-fast);
    }

    .social-link:hover {
      background: var(--sun-orange-yellow);
      color: var(--white);
      transform: translateY(-2px);
    }

    .footer-title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--white);
      margin-bottom: var(--spacing-lg);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .footer-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .footer-list li {
      margin-bottom: var(--spacing-sm);
    }

    .footer-link {
      color: var(--gray-400);
      text-decoration: none;
      font-size: 0.875rem;
      transition: color var(--transition-fast);
    }

    .footer-link:hover {
      color: var(--sun-orange-yellow);
    }

    .newsletter-description {
      color: var(--gray-400);
      font-size: 0.875rem;
      margin-bottom: var(--spacing-lg);
    }

    .newsletter-form {
      display: flex;
      gap: var(--spacing-sm);
    }

    .newsletter-input {
      flex: 1;
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--gray-800);
      border: 1px solid var(--gray-700);
      border-radius: var(--radius-md);
      color: var(--white);
      font-size: 0.875rem;
    }

    .newsletter-input:focus {
      outline: none;
      border-color: var(--sun-orange-yellow);
    }

    .newsletter-input::placeholder {
      color: var(--gray-500);
    }

    .newsletter-btn {
      padding: var(--spacing-sm) var(--spacing-lg);
      background: var(--sun-orange-yellow);
      color: var(--white);
      border: none;
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all var(--transition-fast);
      white-space: nowrap;
    }

    .newsletter-btn:hover {
      background: var(--sun-yellow);
      transform: translateY(-1px);
    }

    .footer-bottom {
      border-top: 1px solid var(--gray-800);
      padding: var(--spacing-lg) 0;
    }

    .footer-bottom-content {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .copyright {
      color: var(--gray-500);
      font-size: 0.875rem;
      margin: 0;
    }

    @media (max-width: 1024px) {
      .footer-content {
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-xl);
      }
    }

    @media (max-width: 768px) {
      .footer-content {
        grid-template-columns: 1fr;
        gap: var(--spacing-lg);
      }

      .footer-bottom-content {
        text-align: center;
      }

      .newsletter-form {
        flex-direction: column;
      }
    }
  `]
})
export class FooterComponent {
  subscribeNewsletter(email: string): void {
    if (email && this.isValidEmail(email)) {
      // In a real app, this would call a service to subscribe the user
      alert('Thanks for subscribing! You\'ll receive our latest updates.');
    } else {
      alert('Please enter a valid email address.');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
