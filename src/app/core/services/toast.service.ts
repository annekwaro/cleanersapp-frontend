import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  message = signal<string | null>(null);
  private timer: any = null;

  show(message: string) {
    this.message.set(message);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.message.set(null), 3200);
  }

  /** Pulls the backend's `{ error }` message out of an HttpErrorResponse. */
  error(err: any, fallback = 'Something went wrong') {
    this.show(err?.error?.error || fallback);
  }
}
