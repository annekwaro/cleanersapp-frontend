import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Booking, DAYS, Profile } from '../core/models';
import { ApiService } from '../core/services/api.service';
import { BookingsStore } from '../core/services/bookings.store';
import { GuestRequestService } from '../core/services/guest-request.service';
import { ToastService } from '../core/services/toast.service';
import { money, startOfDay, toLocalIso } from '../core/format';
import { IconComponent } from './icon.component';

interface DayOption {
  date: Date;
  weekday: string;
  day: number;
  month: string;
  usual: boolean; // one of the cleaner's usual working days
}

/**
 * Propose a cleaning slot. Two modes:
 * - inside a chat: pass `matchId`
 * - straight from a cleaner's profile (no match needed, works for guests): pass `cleaner`
 */
@Component({
  selector: 'app-booking-sheet',
  standalone: true,
  imports: [FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scrim" (click)="closed.emit()">
      <form class="sheet" role="dialog" aria-modal="true" aria-label="Request a clean"
        (click)="$event.stopPropagation()" (ngSubmit)="submit()">
        <div class="sheet-grip"></div>
        <div class="mb-5 flex items-start justify-between">
          <div>
            <h2 class="font-display text-2xl font-semibold">{{ isCleaner() ? 'Offer a time' : 'Request a clean' }}</h2>
            <p class="text-sm text-muted">
              {{ name() }} will be asked to confirm.@if (cleaner()) { No payment now. }
            </p>
          </div>
          <button type="button" class="grid h-9 w-9 place-items-center rounded-full bg-white" (click)="closed.emit()" aria-label="Close">
            <app-icon name="x" [size]="18" />
          </button>
        </div>

        <p class="label">Day</p>
        <div class="scroll-x -mx-5 mb-1 flex gap-2 px-5 sm:-mx-7 sm:px-7">
          @for (d of days; track d.date.getTime(); let i = $index) {
            <button type="button" (click)="dayIndex.set(i)"
              class="relative flex w-14 shrink-0 flex-col items-center rounded-2xl py-2.5 transition"
              [class]="dayIndex() === i ? 'bg-coal-900 text-cream-50' : d.usual ? 'bg-white text-coal-900' : 'bg-white/50 text-coal-900/50'">
              <span class="text-[0.7rem] font-semibold uppercase opacity-70">{{ d.weekday }}</span>
              <span class="font-display text-xl font-semibold">{{ d.day }}</span>
              <span class="text-[0.7rem] opacity-70">{{ d.month }}</span>
              @if (hasUsualDays() && d.usual) {
                <span class="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand-500"></span>
              }
            </button>
          }
        </div>
        <p class="hint mb-5">
          @if (hasUsualDays()) {
            <span class="inline-block h-1.5 w-1.5 rounded-full bg-brand-500 align-middle"></span> {{ name() }} usually works these days.
          }
        </p>

        <div class="mb-5 grid grid-cols-2 gap-3">
          <div>
            <label class="label" for="bk-time">Start</label>
            <select id="bk-time" class="field" name="time" [ngModel]="time()" (ngModelChange)="time.set($event)">
              @for (t of times; track t) { <option [value]="t">{{ t }}</option> }
            </select>
          </div>
          <div>
            <p class="label">Hours</p>
            <div class="flex items-center justify-between rounded-2xl border border-line bg-white p-1.5">
              <button type="button" class="grid h-9 w-9 place-items-center rounded-full bg-cream-100" (click)="step(-0.5)" aria-label="Fewer hours"><app-icon name="minus" [size]="16" /></button>
              <span class="font-display text-lg font-semibold">{{ hours() }}</span>
              <button type="button" class="grid h-9 w-9 place-items-center rounded-full bg-cream-100" (click)="step(0.5)" aria-label="More hours"><app-icon name="plus" [size]="16" /></button>
            </div>
          </div>
        </div>

        @if (cleaner()) {
          <div class="mb-4">
            <label class="label" for="bk-message">Message to {{ name() }}</label>
            <textarea id="bk-message" class="field" rows="2" name="message" [(ngModel)]="message"
              placeholder="Hi! 2-bed flat, kitchen and bathroom matter most. Would this time work?"></textarea>
            <p class="hint">Starts your chat — you can talk details while they decide.</p>
          </div>
        }

        <div class="mb-4">
          <label class="label" for="bk-address">Address</label>
          <input id="bk-address" class="field" name="address" [(ngModel)]="address" placeholder="Street, building, floor" autocomplete="street-address" />
          <p class="hint">Only shared with {{ name() }} inside this booking.</p>
        </div>
        <div class="mb-5">
          <label class="label" for="bk-notes">Notes</label>
          <textarea id="bk-notes" class="field" rows="2" name="notes" [(ngModel)]="notes"
            placeholder="e.g. Key under the mat, friendly cat, focus on the oven"></textarea>
        </div>

        <div class="mb-5 flex items-center justify-between rounded-2xl bg-brand-100 px-4 py-3">
          <span class="text-sm text-coal-800">{{ hours() }}h × {{ rateText() }}</span>
          <span class="font-display text-2xl font-semibold text-coal-900">{{ total() }}</span>
        </div>

        <button type="submit" class="btn btn-primary w-full" [disabled]="busy()">
          <app-icon name="calendar-plus" [size]="18" /> {{ busy() ? 'Sending…' : 'Send request' }}
        </button>
      </form>
    </div>`,
})
export class BookingSheetComponent implements OnInit {
  private api = inject(ApiService);
  private store = inject(BookingsStore);
  private toast = inject(ToastService);
  private guestRequest = inject(GuestRequestService);

  matchId = input<number | null>(null);
  cleaner = input<Profile | null>(null);
  otherName = input('them');
  hourlyRate = input<number | null>(null);
  isCleaner = input(false);

  /** Chat mode: the booking was created. */
  created = output<Booking>();
  /** Direct mode: the request was sent; opens this chat. */
  requested = output<number>();
  /** Direct mode, guest: the request is saved and needs an account to send. */
  needsAccount = output<void>();
  closed = output<void>();

  name = computed(() => this.cleaner()?.name.split(' ')[0] ?? this.otherName());
  rate = computed(() => this.cleaner()?.hourlyRate ?? this.hourlyRate());
  hasUsualDays = computed(() => (this.cleaner()?.availableDays.length ?? 0) > 0);

  days: DayOption[] = [];
  times = Array.from({ length: 25 }, (_, i) => {
    const mins = 7 * 60 + i * 30; // 07:00 → 19:00
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  });

  dayIndex = signal(0);
  time = signal('09:00');
  hours = signal(3);
  address = '';
  notes = '';
  message = '';
  busy = signal(false);

  rateText = computed(() => (this.rate() ? money(this.rate()) : 'rate'));
  total = computed(() => (this.rate() ? money(this.rate()! * this.hours()) : '—'));

  ngOnInit() {
    const usual = this.cleaner()?.availableDays ?? [];
    this.days = Array.from({ length: 21 }, (_, i) => {
      const date = startOfDay(new Date());
      date.setDate(date.getDate() + i + 1);
      return {
        date,
        weekday: date.toLocaleDateString(undefined, { weekday: 'short' }),
        day: date.getDate(),
        month: date.toLocaleDateString(undefined, { month: 'short' }),
        usual: !usual.length || usual.includes(DAYS[(date.getDay() + 6) % 7]),
      };
    });
    // Start on the first day the cleaner usually works
    this.dayIndex.set(Math.max(this.days.findIndex((d) => d.usual), 0));
  }

  step(delta: number) {
    this.hours.update((h) => Math.min(12, Math.max(1, h + delta)));
  }

  submit() {
    const [hh, mm] = this.time().split(':').map(Number);
    const start = new Date(this.days[this.dayIndex()].date);
    start.setHours(hh, mm, 0, 0);
    const slot = {
      startAt: toLocalIso(start),
      durationHours: this.hours(),
      address: this.address.trim() || undefined,
      notes: this.notes.trim() || undefined,
    };

    this.busy.set(true);
    const cleaner = this.cleaner();
    if (cleaner) {
      this.guestRequest
        .send({ ...slot, cleanerId: cleaner.id, message: this.message.trim() || undefined }, cleaner.name)
        .subscribe({
          next: (outcome) => {
            this.busy.set(false);
            if (outcome.status === 'needs-account') {
              this.needsAccount.emit();
              return;
            }
            this.store.upsert(outcome.result.booking);
            this.toast.show(`Request sent to ${this.name()}`);
            this.requested.emit(outcome.result.matchId);
          },
          error: (err) => {
            this.busy.set(false);
            this.toast.error(err, 'Could not send request');
          },
        });
      return;
    }

    this.api.createBooking({ ...slot, matchId: this.matchId()! }).subscribe({
      next: (booking) => {
        this.busy.set(false);
        this.store.upsert(booking);
        this.toast.show('Request sent');
        this.created.emit(booking);
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(err, 'Could not send request');
      },
    });
  }
}
