import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { BookingsStore } from '../../core/services/bookings.store';
import { ToastService } from '../../core/services/toast.service';
import { Profile } from '../../core/models';
import { dayLabel, money, toDate } from '../../core/format';
import { profileStrength } from '../../core/profile-strength';
import { SwipeDeckComponent, SwipeDirection } from '../../shared/swipe-deck.component';
import { ProfileSheetComponent } from '../../shared/profile-sheet.component';
import { MatchModalComponent } from '../../shared/match-modal.component';
import { IconComponent } from '../../shared/icon.component';

/** Cleaner's Home tab: today at a glance, then homes to swipe on. */
@Component({
  selector: 'app-swipe',
  standalone: true,
  imports: [RouterLink, SwipeDeckComponent, ProfileSheetComponent, MatchModalComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './swipe.component.html',
})
export class SwipeComponent implements OnInit {
  auth = inject(AuthService);
  store = inject(BookingsStore);
  private api = inject(ApiService);
  private router = inject(Router);
  private toast = inject(ToastService);

  profiles = signal<Profile[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  detail = signal<Profile | null>(null);
  match = signal<{ profile: Profile; matchId?: number } | null>(null);
  strength = signal<number | null>(null);

  next = computed(() => {
    const b = this.store.upcoming()[0];
    if (!b) return null;
    const d = toDate(b.startAt);
    return {
      day: dayLabel(d).split(',')[0],
      time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
      who: b.otherUserName.split(' ')[0],
    };
  });

  monthEarned = computed(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return money(
      this.store
        .bookings()
        .filter((b) => b.status === 'COMPLETED' && toDate(b.startAt) >= from)
        .reduce((s, b) => s + b.totalAmount, 0)
    );
  });

  ngOnInit() {
    this.loadProfiles();
    this.api.getMyProfile().subscribe({
      next: (me) => this.strength.set(profileStrength(me)),
      error: () => this.strength.set(null),
    });
  }

  loadProfiles() {
    this.loading.set(true);
    this.error.set(null);
    this.api.getSwipeProfiles().subscribe({
      next: (data) => {
        this.profiles.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'Could not load homes. The server may be waking up.');
      },
    });
  }

  onSwipe(e: { profile: Profile; direction: SwipeDirection }) {
    // Remove immediately so the deck feels instant; the request runs behind it
    this.profiles.update((list) => list.filter((p) => p.id !== e.profile.id));
    this.api.swipe(e.profile.id, e.direction).subscribe({
      next: (res) => {
        if (res.matched) this.match.set({ profile: e.profile, matchId: res.matchId });
      },
      error: (err) => {
        const msg: string = err?.error?.error || '';
        if (!msg.includes('already')) this.toast.error(err, 'Swipe failed — try again');
      },
    });
  }

  fromSheet(direction: SwipeDirection) {
    const p = this.detail();
    this.detail.set(null);
    if (p) this.onSwipe({ profile: p, direction });
  }

  openChat() {
    const m = this.match();
    this.match.set(null);
    this.router.navigate(m?.matchId ? ['/chat', m.matchId] : ['/messages']);
  }
}
