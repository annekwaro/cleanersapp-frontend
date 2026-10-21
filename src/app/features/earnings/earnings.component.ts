import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { BookingsStore } from '../../core/services/bookings.store';
import { Booking } from '../../core/models';
import { money, startOfWeek, toDate } from '../../core/format';
import { IconComponent } from '../../shared/icon.component';
import { AvatarComponent } from '../../shared/avatar.component';

interface WeekBar {
  label: string;
  range: string;
  amount: number;
  jobs: number;
  current: boolean;
}

/**
 * Cleaner earnings, computed from completed bookings. Money is settled
 * directly with clients; this is the cleaner's own ledger.
 */
@Component({
  selector: 'app-earnings',
  standalone: true,
  imports: [DatePipe, RouterLink, IconComponent, AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './earnings.component.html',
})
export class EarningsComponent implements OnInit {
  store = inject(BookingsStore);
  private api = inject(ApiService);

  rating = signal<number | null>(null);
  hovered = signal<number | null>(null);
  money = money;

  private completed = computed(() => this.store.bookings().filter((b) => b.status === 'COMPLETED'));

  private sumSince(from: Date, to = new Date(8.64e15)) {
    return this.completed()
      .filter((b) => toDate(b.startAt) >= from && toDate(b.startAt) < to)
      .reduce((s, b) => s + b.totalAmount, 0);
  }

  stats = computed(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const all = this.store.bookings();
    const cancelledByMe = all.filter((b) => b.status === 'CANCELLED' && b.cancelledByMe).length;
    const confirmedEver = all.filter((b) => b.status === 'COMPLETED' || b.status === 'CANCELLED' || b.status === 'CONFIRMED').length;

    return {
      month: this.sumSince(monthStart),
      lastMonth: this.sumSince(lastMonthStart, monthStart),
      week: this.sumSince(startOfWeek(now)),
      allTime: this.sumSince(new Date(0)),
      upcoming: this.store.upcoming().reduce((s, b) => s + b.totalAmount, 0),
      upcomingJobs: this.store.upcoming().length,
      pending: all.filter((b) => b.status === 'REQUESTED').reduce((s, b) => s + b.totalAmount, 0),
      jobs: this.completed().length,
      hours: this.completed().reduce((s, b) => s + b.durationHours, 0),
      cancelRate: confirmedEver ? Math.round((cancelledByMe / confirmedEver) * 100) : 0,
      monthName: now.toLocaleDateString(undefined, { month: 'long' }),
    };
  });

  monthDelta = computed(() => {
    const { month, lastMonth } = this.stats();
    if (!lastMonth) return null;
    return Math.round(((month - lastMonth) / lastMonth) * 100);
  });

  /** Last 8 weeks, oldest first. */
  weeks = computed<WeekBar[]>(() => {
    const thisWeek = startOfWeek(new Date());
    const f = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    return Array.from({ length: 8 }, (_, i) => {
      const from = new Date(thisWeek);
      from.setDate(from.getDate() - (7 - i) * 7);
      const to = new Date(from);
      to.setDate(to.getDate() + 7);
      const items = this.completed().filter((b) => toDate(b.startAt) >= from && toDate(b.startAt) < to);
      const end = new Date(to);
      end.setDate(end.getDate() - 1);
      return {
        label: i === 7 ? 'This wk' : f(from),
        range: `${f(from)} – ${f(end)}`,
        amount: items.reduce((s, b) => s + b.totalAmount, 0),
        jobs: items.length,
        current: i === 7,
      };
    });
  });

  maxWeek = computed(() => Math.max(...this.weeks().map((w) => w.amount), 1));
  hasHistory = computed(() => this.weeks().some((w) => w.amount > 0));

  recent = computed<Booking[]>(() => [...this.completed()].reverse().slice(0, 8));

  ngOnInit() {
    this.store.refresh();
    this.api.getMyProfile().subscribe({ next: (p) => this.rating.set(p.rating), error: () => {} });
  }

  barHeight(amount: number) {
    return amount ? Math.max((amount / this.maxWeek()) * 100, 3) : 0;
  }

  toDate = toDate;
}
