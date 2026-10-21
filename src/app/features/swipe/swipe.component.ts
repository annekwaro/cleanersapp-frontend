import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { Profile } from '../../core/models';
import { profileStrength } from '../../core/profile-strength';
import { SwipeDeckComponent, SwipeDirection } from '../../shared/swipe-deck.component';
import { ProfileSheetComponent } from '../../shared/profile-sheet.component';
import { MatchModalComponent } from '../../shared/match-modal.component';
import { IconComponent } from '../../shared/icon.component';

type Sort = 'best' | 'price' | 'experience';

@Component({
  selector: 'app-swipe',
  standalone: true,
  imports: [RouterLink, SwipeDeckComponent, ProfileSheetComponent, MatchModalComponent, IconComponent],
  templateUrl: './swipe.component.html',
  styleUrl: './swipe.component.css',
})
export class SwipeComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);
  private toast = inject(ToastService);

  profiles = signal<Profile[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  filter = signal('All');
  sort = signal<Sort>('best');
  detail = signal<Profile | null>(null);
  match = signal<{ profile: Profile; matchId?: number } | null>(null);
  strength = signal<number | null>(null);

  services = computed(() => {
    const counts = new Map<string, number>();
    this.profiles().forEach((p) => p.services.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1)));
    return ['All', ...[...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([s]) => s)];
  });

  deck = computed(() => {
    const f = this.filter();
    const list = this.profiles().filter((p) => f === 'All' || p.services.includes(f));
    const by: Record<Sort, (a: Profile, b: Profile) => number> = {
      best: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
      price: (a, b) => (a.hourlyRate ?? 1e9) - (b.hourlyRate ?? 1e9),
      experience: (a, b) => (b.yearsExperience ?? 0) - (a.yearsExperience ?? 0),
    };
    return this.auth.isCleaner() ? list : [...list].sort(by[this.sort()]);
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
        this.error.set(err?.error?.error || 'Could not load profiles. The server may be waking up.');
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
    this.router.navigate(m?.matchId ? ['/app/chat', m.matchId] : ['/app/chats']);
  }
}
