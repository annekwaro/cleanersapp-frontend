import { Injectable, signal } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { DirectRequestDraft, DirectRequestResult } from '../models';

export interface PendingRequest {
  draft: DirectRequestDraft;
  cleanerName: string;
}

export type SendOutcome = { status: 'sent'; result: DirectRequestResult } | { status: 'needs-account' };

/**
 * Booking requests made straight from a cleaner's profile. Guests can fill one
 * in before they have an account; it's kept in the browser and sent right
 * after they sign up.
 */
@Injectable({ providedIn: 'root' })
export class GuestRequestService {
  private readonly KEY = 'cleanmatch_pending_request';

  pending = signal<PendingRequest | null>(this.load());

  constructor(private api: ApiService, private auth: AuthService) {}

  send(draft: DirectRequestDraft, cleanerName: string): Observable<SendOutcome> {
    if (!this.auth.isLoggedIn()) {
      this.pending.set({ draft, cleanerName });
      this.save();
      return of({ status: 'needs-account' });
    }
    return this.api.createDirectRequest(draft).pipe(map((result) => ({ status: 'sent', result }) as SendOutcome));
  }

  /** Sends the saved request, if any. Emits the result, or null if there was nothing to send. */
  flush(): Observable<(DirectRequestResult & { cleanerName: string }) | null> {
    const p = this.pending();
    if (!p) return of(null);
    this.clear();
    return this.api.createDirectRequest(p.draft).pipe(map((r) => ({ ...r, cleanerName: p.cleanerName })));
  }

  clear() {
    this.pending.set(null);
    this.save();
  }

  private load(): PendingRequest | null {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || 'null');
    } catch {
      return null;
    }
  }

  private save() {
    try {
      const p = this.pending();
      if (p) localStorage.setItem(this.KEY, JSON.stringify(p));
      else localStorage.removeItem(this.KEY);
    } catch {
      // storage unavailable: the request lives only for this page view
    }
  }
}
