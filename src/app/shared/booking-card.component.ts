import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { Booking } from '../core/models';
import { ApiService } from '../core/services/api.service';
import { BookingsStore } from '../core/services/bookings.store';
import { ToastService } from '../core/services/toast.service';
import { AuthService } from '../core/services/auth.service';
import { dayLabel, money, timeRange, toDate } from '../core/format';
import { IconComponent } from './icon.component';
import { AvatarComponent } from './avatar.component';

const STATUS: Record<string, { label: string; cls: string }> = {
  REQUESTED: { label: 'Pending', cls: 'bg-butter-300/60 text-forest-900' },
  CONFIRMED: { label: 'Confirmed', cls: 'bg-sage-100 text-sage-700' },
  COMPLETED: { label: 'Completed', cls: 'bg-forest-900 text-cream-50' },
  DECLINED: { label: 'Declined', cls: 'bg-clay-100 text-clay-500' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-clay-100 text-clay-500' },
};

@Component({
  selector: 'app-booking-card',
  standalone: true,
  imports: [IconComponent, AvatarComponent, RouterLink, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card p-4" [class.opacity-70]="b().status === 'DECLINED' || b().status === 'CANCELLED'">
      <div class="flex items-start gap-3">
        @if (showPerson()) {
          <app-avatar [name]="b().otherUserName" [src]="b().otherUserProfilePicture" [seed]="b().otherUserId" [size]="44" />
        } @else {
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sage-100 text-sage-700"><app-icon name="calendar" /></span>
        }
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2">
            <p class="truncate font-semibold">{{ showPerson() ? b().otherUserName : day() }}</p>
            <span class="rounded-full px-2.5 py-1 text-[0.7rem] font-bold" [class]="status().cls">{{ status().label }}</span>
          </div>
          <p class="mt-0.5 text-sm text-muted">
            @if (showPerson()) { {{ day() }} · }{{ time() }}
          </p>
        </div>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
        <span class="inline-flex items-center gap-1.5 text-forest-800"><app-icon name="clock" [size]="15" />{{ b().durationHours }}h × {{ rate() }}</span>
        <span class="font-display text-lg font-semibold">{{ total() }}</span>
        @if (b().address) {
          <span class="inline-flex min-w-0 items-center gap-1.5 text-muted"><app-icon name="pin" [size]="15" /><span class="truncate">{{ b().address }}</span></span>
        }
      </div>

      @if (b().notes) {
        <p class="mt-2 rounded-xl bg-cream-100 px-3 py-2 text-sm text-forest-800">“{{ b().notes }}”</p>
      }
      @if (b().status === 'CANCELLED') {
        <p class="mt-2 text-sm text-clay-500">
          Cancelled by {{ b().cancelledByMe ? 'you' : b().otherUserName }}{{ b().cancelReason ? ': ' + b().cancelReason : '' }}
        </p>
      }
      @if (b().status === 'REQUESTED' && b().requestedByMe) {
        <p class="mt-2 text-sm text-muted">Waiting for {{ firstName() }} to confirm.</p>
      }

      <!-- Actions -->
      @if (mode() === 'cancel') {
        <div class="mt-3 space-y-2">
          <input class="field" [(ngModel)]="reason" placeholder="Reason (shared with {{ firstName() }})" maxlength="200" />
          @if (isCleaner() && b().status === 'CONFIRMED' && hoursUntil() < 24) {
            <p class="hint !mt-0 text-clay-500">Less than 24h to go — last-minute cancellations hurt your reputation with clients.</p>
          }
          <div class="flex gap-2">
            <button class="btn btn-ghost btn-sm flex-1" (click)="mode.set(null)">Keep it</button>
            <button class="btn btn-danger btn-sm flex-1" [disabled]="busy()" (click)="run(api.cancelBooking(b().id, reason), 'Booking cancelled')">Cancel booking</button>
          </div>
        </div>
      } @else if (b().canRate) {
        <div class="mt-3 flex items-center justify-between rounded-xl bg-cream-100 px-3 py-2">
          <span class="text-sm font-semibold">How did it go?</span>
          <div class="flex">
            @for (s of [1, 2, 3, 4, 5]; track s) {
              <button type="button" class="p-1 text-butter-500 disabled:opacity-50" [disabled]="busy()" [attr.aria-label]="s + ' stars'"
                (click)="run(api.rateBooking(b().id, s), 'Thanks for rating!')">
                <app-icon name="star" [size]="22" [filled]="false" />
              </button>
            }
          </div>
        </div>
      } @else if (b().canRespond || b().canCancel || b().canComplete || showChatLink()) {
        <div class="mt-3 flex flex-wrap gap-2">
          @if (b().canRespond) {
            <button class="btn btn-primary btn-sm flex-1" [disabled]="busy()" (click)="run(api.confirmBooking(b().id), 'Booking confirmed')">
              <app-icon name="check" [size]="16" /> Accept
            </button>
            <button class="btn btn-ghost btn-sm flex-1" [disabled]="busy()" (click)="run(api.declineBooking(b().id), 'Request declined')">Decline</button>
          } @else if (b().canCancel) {
            <button class="btn btn-ghost btn-sm" (click)="mode.set('cancel')">{{ b().status === 'REQUESTED' ? 'Withdraw' : 'Cancel' }}</button>
          }
          @if (b().canComplete) {
            <button class="btn btn-dark btn-sm flex-1" [disabled]="busy()" (click)="run(api.completeBooking(b().id), 'Marked as done — nice work!')">
              <app-icon name="check" [size]="16" /> Mark as done
            </button>
          }
          @if (showChatLink()) {
            <a class="btn btn-ghost btn-sm ml-auto" [routerLink]="['/app/chat', b().matchId]"><app-icon name="chat" [size]="16" /> Chat</a>
          }
        </div>
      }
      @if (b().rating) {
        <p class="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-forest-800">
          @for (s of stars(); track $index) { <app-icon name="star" [size]="15" [filled]="true" class="text-butter-500" /> }
          <span class="ml-1 font-medium text-muted">rated</span>
        </p>
      }
    </article>`,
})
export class BookingCardComponent {
  api = inject(ApiService);
  private store = inject(BookingsStore);
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  b = input.required<Booking>({ alias: 'booking' });
  showPerson = input(true);
  showChatLink = input(false);
  changed = output<Booking>();

  mode = signal<'cancel' | null>(null);
  busy = signal(false);
  reason = '';

  isCleaner = this.auth.isCleaner;
  status = computed(() => STATUS[this.b().status]);
  day = computed(() => dayLabel(toDate(this.b().startAt)));
  time = computed(() => timeRange(this.b().startAt, this.b().endAt));
  rate = computed(() => money(this.b().hourlyRate));
  total = computed(() => money(this.b().totalAmount));
  firstName = computed(() => this.b().otherUserName.split(' ')[0]);
  hoursUntil = computed(() => (toDate(this.b().startAt).getTime() - Date.now()) / 3600000);
  stars = computed(() => Array.from({ length: this.b().rating ?? 0 }));

  run(action: Observable<Booking>, success: string) {
    this.busy.set(true);
    action.subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.mode.set(null);
        this.store.upsert(updated);
        this.changed.emit(updated);
        this.toast.show(success);
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(err, 'Could not update booking');
      },
    });
  }
}
