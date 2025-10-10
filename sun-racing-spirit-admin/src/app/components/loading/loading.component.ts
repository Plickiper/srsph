import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../core/loading.service';
import { BaseComponent } from '../../core/base-component';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isLoading" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p class="loading-text">Loading...</p>
      </div>
    </div>
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }

    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid #ff8c00;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .loading-text {
      color: white;
      font-size: 16px;
      font-weight: 500;
      margin: 0;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class LoadingComponent extends BaseComponent implements OnInit, OnDestroy {
  isLoading = false;

  constructor(private loadingService: LoadingService) {
    super();
  }

  ngOnInit(): void {
    this.addSubscription(
      this.loadingService.loading$.subscribe(loading => {
        this.isLoading = loading;
      })
    );
  }
}
