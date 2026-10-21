import { Injectable, computed, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Booking } from '../models';
import { toDate } from '../format';

/** Shared list of the user's bookings, used by the nav badge, schedule and earnings. */
@Injectable({ providedIn: 'root' })
export class BookingsStore {
  bookings = signal<Booking[]>([]);
  loaded = signal(false);
  error = signal<string | null>(null);

  needsReply = computed(() => this.bookings().filter((b) => b.canRespond));
  upcoming = computed(() =>
    this.bookings().filter((b) => b.status === 'CONFIRMED' && toDate(b.endAt) > new Date())
  );

  constructor(private api: ApiService) {}

  refresh() {
    this.api.getBookings().subscribe({
      next: (list) => {
        this.bookings.set(list);
        this.loaded.set(true);
        this.error.set(null);
      },
      error: (err) => {
        this.loaded.set(true);
        this.error.set(err?.status === 404 ? 'Bookings need the latest backend deploy.' : err?.error?.error || 'Could not load bookings');
      },
    });
  }

  /** Put a booking returned by an action back into the list. */
  upsert(b: Booking) {
    this.bookings.update((list) => {
      const i = list.findIndex((x) => x.id === b.id);
      if (i === -1) return [...list, b].sort((a, c) => a.startAt.localeCompare(c.startAt));
      const copy = [...list];
      copy[i] = b;
      return copy;
    });
  }

  clear() {
    this.bookings.set([]);
    this.loaded.set(false);
  }
}
