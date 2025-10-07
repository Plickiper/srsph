import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Order Details</h1>
        <p>View and manage order information</p>
      </div>
      <div class="page-content">
        <div class="card">
          <div class="card-content">
            <p>Order detail functionality will be implemented here.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 40px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .page-header {
      margin-bottom: 40px;
    }
    
    .page-header h1 {
      font-size: 2.5rem;
      color: white;
      margin: 0 0 8px 0;
    }
    
    .page-header p {
      color: rgba(255, 255, 255, 0.7);
      margin: 0;
    }
    
    .page-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
  `]
})
export class OrderDetailComponent {}