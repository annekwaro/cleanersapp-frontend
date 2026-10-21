import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { BookingsStore } from '../../core/services/bookings.store';
import { Booking, Match } from '../../core/models';
import { dayLabel, relativeShort, toDate } from '../../core/format';
import { AvatarComponent } from '../../shared/avatar.component';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-matches',
  standalone: true,
  imports: [RouterLink, FormsModule, AvatarComponent, IconComponent],
  templateUrl: './matches.component.html',
  styleUrl: './matches.component.css',
})
export class MatchesComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  auth = inject(AuthService);
  private store = inject(BookingsStore);

  matches = signal<Match[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  query = signal('');
  private poll: any = null;

  relative = relativeShort;

  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.matches().filter((m) => !q || m.otherUserName.toLowerCase().includes(q));
  });

  fresh = computed(() =>
    this.filtered()
      .filter((m) => !m.lastMessage)
      .sort((a, b) => b.matchedAt.localeCompare(a.matchedAt))
  );

  conversations = computed(() =>
    this.filtered()
      .filter((m) => !!m.lastMessage)
      .sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''))
  );

  /** Next active booking per match, shown as a chip on the conversation row. */
  nextBooking = computed(() => {
    const map = new Map<number, Booking>();
    const now = new Date();
    for (const b of this.store.bookings()) {
      if ((b.status === 'CONFIRMED' || b.status === 'REQUESTED') && toDate(b.startAt) > now && !map.has(b.matchId)) {
        map.set(b.matchId, b);
      }
    }
    return map;
  });

  ngOnInit() {
    this.loadMatches();
    this.poll = setInterval(() => this.loadMatches(true), 15000);
  }

  ngOnDestroy() {
    clearInterval(this.poll);
  }

  loadMatches(silent = false) {
    if (!silent) this.loading.set(true);
    this.api.getMatches().subscribe({
      next: (data) => {
        this.matches.set(data);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        if (!silent) this.error.set(err?.error?.error || 'Could not load chats');
      },
    });
  }

  bookingLabel(b: Booking): string {
    const d = toDate(b.startAt);
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${b.status === 'REQUESTED' ? 'Pending · ' : ''}${dayLabel(d).split(',')[0]} ${time}`;
  }
}
