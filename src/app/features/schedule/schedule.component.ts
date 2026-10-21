import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BookingsStore } from '../../core/services/bookings.store';
import { Booking } from '../../core/models';
import { dayLabel, money, sameDay, startOfWeek, toDate } from '../../core/format';
import { BookingCardComponent } from '../../shared/booking-card.component';
import { IconComponent } from '../../shared/icon.component';

type Tab = 'requests' | 'upcoming' | 'past' | 'cancelled';

interface Group {
  label: string;
  items: Booking[];
}

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [RouterLink, BookingCardComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './schedule.component.html',
})
export class ScheduleComponent implements OnInit {
  auth = inject(AuthService);
  store = inject(BookingsStore);

  tab = signal<Tab>('upcoming');
  selectedDay = signal<Date | null>(null);
  weekOffset = signal(0);

  private now = () => new Date();

  requests = computed(() => this.store.bookings().filter((b) => b.status === 'REQUESTED'));
  upcoming = computed(() =>
    this.store.bookings().filter((b) => b.status === 'CONFIRMED' && toDate(b.endAt) > this.now())
  );
  past = computed(() =>
    this.store
      .bookings()
      .filter((b) => b.status === 'COMPLETED' || (b.status === 'CONFIRMED' && toDate(b.endAt) <= this.now()))
      .reverse()
  );
  cancelled = computed(() =>
    this.store.bookings().filter((b) => b.status === 'CANCELLED' || b.status === 'DECLINED').reverse()
  );

  tabs = computed(() => [
    { id: 'requests' as Tab, label: 'Requests', count: this.requests().length, alert: this.store.needsReply().length },
    { id: 'upcoming' as Tab, label: 'Upcoming', count: this.upcoming().length, alert: 0 },
    { id: 'past' as Tab, label: 'Past', count: this.past().length, alert: 0 },
    { id: 'cancelled' as Tab, label: 'Cancelled', count: this.cancelled().length, alert: 0 },
  ]);

  week = computed(() => {
    const start = startOfWeek(new Date());
    start.setDate(start.getDate() + this.weekOffset() * 7);
    const active = this.store.bookings().filter((b) => b.status === 'CONFIRMED' || b.status === 'REQUESTED' || b.status === 'COMPLETED');
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const items = active.filter((b) => sameDay(toDate(b.startAt), date));
      return {
        date,
        weekday: date.toLocaleDateString(undefined, { weekday: 'narrow' }),
        day: date.getDate(),
        today: sameDay(date, new Date()),
        confirmed: items.some((b) => b.status !== 'REQUESTED'),
        pending: items.some((b) => b.status === 'REQUESTED'),
      };
    });
  });

  weekTitle = computed(() => {
    const first = this.week()[0].date;
    const last = this.week()[6].date;
    const f = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    return `${f(first)} – ${f(last)}`;
  });

  /** Totals for the visible week, so cleaners see their load at a glance. */
  weekSummary = computed(() => {
    const days = this.week();
    const from = days[0].date;
    const to = new Date(days[6].date);
    to.setDate(to.getDate() + 1);
    const items = this.store
      .bookings()
      .filter((b) => (b.status === 'CONFIRMED' || b.status === 'COMPLETED') && toDate(b.startAt) >= from && toDate(b.startAt) < to);
    return {
      jobs: items.length,
      hours: items.reduce((s, b) => s + b.durationHours, 0),
      amount: money(items.reduce((s, b) => s + b.totalAmount, 0)),
    };
  });

  list = computed(() => {
    const day = this.selectedDay();
    if (day) {
      return this.store
        .bookings()
        .filter((b) => b.status !== 'DECLINED' && sameDay(toDate(b.startAt), day));
    }
    return { requests: this.requests(), upcoming: this.upcoming(), past: this.past(), cancelled: this.cancelled() }[this.tab()];
  });

  groups = computed<Group[]>(() => {
    const out: Group[] = [];
    for (const b of this.list()) {
      const label = dayLabel(toDate(b.startAt));
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(b);
      else out.push({ label, items: [b] });
    }
    return out;
  });

  ngOnInit() {
    this.store.refresh();
    if (this.store.needsReply().length) this.tab.set('requests');
  }

  pickDay(d: Date) {
    this.selectedDay.set(this.selectedDay() && sameDay(this.selectedDay()!, d) ? null : d);
  }

  pickTab(t: Tab) {
    this.selectedDay.set(null);
    this.tab.set(t);
  }

  longDay(d: Date) {
    return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  isSelected(d: Date) {
    const s = this.selectedDay();
    return !!s && sameDay(s, d);
  }
}
