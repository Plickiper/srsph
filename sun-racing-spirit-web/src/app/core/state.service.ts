import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class StateService<T> {
  private stateSubject = new BehaviorSubject<State<T>>({
    data: null,
    loading: false,
    error: null
  });

  public state$: Observable<State<T>> = this.stateSubject.asObservable();

  get currentState(): State<T> {
    return this.stateSubject.value;
  }

  setLoading(loading: boolean): void {
    this.stateSubject.next({
      ...this.currentState,
      loading
    });
  }

  setData(data: T): void {
    this.stateSubject.next({
      data,
      loading: false,
      error: null
    });
  }

  setError(error: string): void {
    this.stateSubject.next({
      ...this.currentState,
      loading: false,
      error
    });
  }

  clearError(): void {
    this.stateSubject.next({
      ...this.currentState,
      error: null
    });
  }

  reset(): void {
    this.stateSubject.next({
      data: null,
      loading: false,
      error: null
    });
  }
}
