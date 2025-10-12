import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  returnUrl = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cartService: CartService
  ) {
    this.loginForm = this.fb.group({
      usernameOrEmail: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngOnInit(): void {
    // Get return URL from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    
    // If user is already logged in, redirect to return URL
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  onSubmit(): void {
    if (this.loginForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';

      const { usernameOrEmail, password } = this.loginForm.value;

      this.authService.login(usernameOrEmail, password).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success && response.user) {
            // Merge any guest cart items into the authenticated user's cart
            const userId = response.user!.id;
            this.cartService.mergeLocalGuestCartToUser(userId)
              .then(() => {
                // Load user's cart after merge
                this.cartService.loadCartForUser(userId);
                // Navigate to intended page (e.g., /checkout)
                this.router.navigate([this.returnUrl || '/']);
              })
              .catch(() => {
                // Even if merge fails, proceed with user cart load
                this.cartService.loadCartForUser(userId);
                this.router.navigate([this.returnUrl || '/']);
              });
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Login failed. Please try again.';
          console.error('Login error:', error);
        }
      });
    }
  }

  goToRegister(): void {
    this.router.navigate(['/register'], { 
      queryParams: { returnUrl: this.returnUrl } 
    });
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }
}