import { OnDestroy, Injectable } from '@angular/core';
import { Subscription } from 'rxjs';

@Injectable()
export abstract class BaseComponent implements OnDestroy {
  protected subscriptions: Subscription = new Subscription();

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  protected addSubscription(subscription: Subscription): void {
    this.subscriptions.add(subscription);
  }
}
