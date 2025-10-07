import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { AdminLayoutComponent } from './components/admin-layout/admin-layout.component';
import { SessionService } from './services/session.service';

@Component({
  selector: 'app-root',
  imports: [AdminLayoutComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('sun-racing-spirit-admin');

  constructor(private sessionService: SessionService) {}

  ngOnInit(): void {
    // Initialize session management
    // The session service will automatically start tracking activity and refreshing tokens
  }

  ngOnDestroy(): void {
    // Cleanup is handled by the session service
  }
}
