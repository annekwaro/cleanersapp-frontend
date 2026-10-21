import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Profile } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { GuestLikesService } from '../../core/services/guest-likes.service';
import { SwipeDeckComponent, SwipeDirection } from '../../shared/swipe-deck.component';
import { ProfileSheetComponent } from '../../shared/profile-sheet.component';
import { IconComponent } from '../../shared/icon.component';
import { LogoComponent } from '../../shared/logo.component';

/**
 * Public front door. Visitors browse and swipe real cleaners straight away;
 * an account is only asked for once they like someone.
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, SwipeDeckComponent, ProfileSheetComponent, IconComponent, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing.component.html',
})
export class LandingComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  guestLikes = inject(GuestLikesService);

  all = signal<Profile[]>([]);
  seen = signal<Set<number>>(new Set());
  loading = signal(true);
  failed = signal(false);
  filter = signal<string>('All');
  detail = signal<Profile | null>(null);
  prompt = signal<Profile | null>(null);

  services = computed(() => {
    const counts = new Map<string, number>();
    this.all().forEach((p) => p.services.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1)));
    return ['All', ...[...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([s]) => s)];
  });

  deck = computed(() => {
    const liked = new Set(this.guestLikes.likes().map((l) => l.id));
    const f = this.filter();
    return this.all().filter(
      (p) => !this.seen().has(p.id) && !liked.has(p.id) && (f === 'All' || p.services.includes(f))
    );
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.failed.set(false);
    this.api.getPublicCleaners().subscribe({
      next: (list) => {
        this.all.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.failed.set(true);
      },
    });
  }

  onSwipe(e: { profile: Profile; direction: SwipeDirection }) {
    this.seen.update((s) => new Set(s).add(e.profile.id));
    if (e.direction === 'LIKE') {
      this.guestLikes.add(e.profile);
      const n = this.guestLikes.likes().length;
      // Ask after the first like, then every third — never on every swipe
      if (n === 1 || n % 3 === 0) this.prompt.set(e.profile);
    }
  }

  likeFromSheet() {
    const p = this.detail();
    this.detail.set(null);
    if (p) this.onSwipe({ profile: p, direction: 'LIKE' });
  }

  passFromSheet() {
    const p = this.detail();
    this.detail.set(null);
    if (p) this.onSwipe({ profile: p, direction: 'PASS' });
  }

  startOver() {
    this.seen.set(new Set());
    this.filter.set('All');
  }

  signUp(role: 'HOMEOWNER' | 'CLEANER' = 'HOMEOWNER') {
    this.router.navigate(['/register'], { queryParams: { role } });
  }
}
