import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Profile, SERVICES } from '../../core/models';
import { money } from '../../core/format';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AuthPromptService } from '../../core/services/auth-prompt.service';
import { GuestLikesService } from '../../core/services/guest-likes.service';
import { GuestRequestService } from '../../core/services/guest-request.service';
import { PublicCleanersService } from '../../core/services/public-cleaners.service';
import { ToastService } from '../../core/services/toast.service';
import { SwipeDeckComponent, SwipeDirection } from '../../shared/swipe-deck.component';
import { ProfileSheetComponent } from '../../shared/profile-sheet.component';
import { BookingSheetComponent } from '../../shared/booking-sheet.component';
import { MatchModalComponent } from '../../shared/match-modal.component';
import { IconComponent } from '../../shared/icon.component';
import { swatchFor } from '../../shared/avatar.component';
import { initials } from '../../core/format';

type Mode = 'browse' | 'swipe';

interface Category {
  name: string;
  icon: string;
}

/** Icon for a service name, by keyword; anything unknown gets sparkles. */
const SERVICE_ICONS: [RegExp, string][] = [
  [/deep|spring/i, 'sparkles'],
  [/regular|standard|weekly|home/i, 'home'],
  [/tenancy|move|moving/i, 'truck'],
  [/laundry|iron/i, 'shirt'],
  [/window/i, 'window'],
  [/office|commercial/i, 'building'],
  [/airbnb|holiday|key/i, 'key'],
  [/eco|green|organic/i, 'leaf'],
  [/oven|kitchen/i, 'box'],
];

const MODE_KEY = 'cleanmatch_browse_mode';

/**
 * Home for guests and homeowners. Opens on the swipe deck; a list view with
 * search, categories and cleaner cards is one tap away.
 */
@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    NgTemplateOutlet,
    SwipeDeckComponent,
    ProfileSheetComponent,
    BookingSheetComponent,
    MatchModalComponent,
    IconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './browse.component.html',
})
export class BrowseComponent implements OnInit {
  private router = inject(Router);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private prompts = inject(AuthPromptService);
  auth = inject(AuthService);
  publicCleaners = inject(PublicCleanersService);
  guestLikes = inject(GuestLikesService);
  guestRequest = inject(GuestRequestService);

  mode = signal<Mode>(this.loadMode());
  query = signal('');
  category = signal('All');
  detail = signal<Profile | null>(null);
  requesting = signal<Profile | null>(null);
  match = signal<{ profile: Profile; matchId?: number } | null>(null);

  /** Cleaners passed or liked in swipe mode this visit. */
  seen = signal<Set<number>>(new Set());
  /** Signed-in homeowners: likes sent this visit. Guests use GuestLikesService. */
  private likedNow = signal<Set<number>>(new Set());
  /** Signed-in homeowners swipe through cleaners they haven't swiped on yet. */
  private unswiped = signal<Profile[] | null>(null);

  all = this.publicCleaners.cleaners;
  loading = computed(() => !this.publicCleaners.ready());
  failed = this.publicCleaners.failed;
  signedIn = computed(() => !!this.auth.currentUser());

  liked = computed(() => new Set([...this.guestLikes.likes().map((l) => l.id), ...this.likedNow()]));

  categories = computed<Category[]>(() => {
    const counts = new Map<string, number>();
    this.all().forEach((p) => p.services.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1)));
    // Most offered first, topped up from the standard list so the row is never empty
    const offered = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
    const top = [...new Set([...offered, ...SERVICES])].slice(0, 7);
    return [{ name: 'All', icon: 'grid' }, ...top.map((name) => ({ name, icon: this.iconFor(name) }))];
  });

  /** Search + category, best first. */
  results = computed(() => {
    const q = this.query().trim().toLowerCase();
    const c = this.category();
    return this.all()
      .filter((p) => c === 'All' || p.services.includes(c))
      .filter(
        (p) =>
          !q ||
          [p.name, p.headline, p.serviceArea, ...p.services].some((v) => v?.toLowerCase().includes(q))
      )
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.completedJobs - a.completedJobs);
  });

  /** When nothing is being searched: a few highlights up top, everyone else below. */
  filtering = computed(() => !!this.query().trim() || this.category() !== 'All');
  featured = computed(() => (this.filtering() ? [] : this.results().slice(0, 4)));
  rest = computed(() => (this.filtering() ? this.results() : this.results().slice(4)));

  deck = computed(() => {
    const c = this.category();
    const pool = this.signedIn() ? this.unswiped() ?? [] : this.all();
    return pool.filter(
      (p) => !this.seen().has(p.id) && !this.liked().has(p.id) && (c === 'All' || p.services.includes(c))
    );
  });
  deckLoading = computed(() => (this.signedIn() ? this.unswiped() === null : this.loading()));

  ngOnInit() {
    this.publicCleaners.load();
    if (this.mode() === 'swipe') this.loadUnswiped();
  }

  setMode(mode: Mode) {
    this.mode.set(mode);
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      // per-visit only
    }
    if (mode === 'swipe') this.loadUnswiped();
    window.scrollTo({ top: 0 });
  }

  retry() {
    this.publicCleaners.failed.set(false);
    this.publicCleaners.load();
  }

  // ----- likes -----

  like(p: Profile) {
    if (this.liked().has(p.id)) return;
    if (!this.signedIn()) {
      this.guestLikes.add(p);
      const n = this.guestLikes.likes().length;
      // Ask after the first like, then every third — never on every tap
      if (n === 1 || n % 3 === 0) this.askToSaveLikes(p);
      else this.toast.show(`Liked ${this.first(p)}`);
      return;
    }
    this.likedNow.update((s) => new Set(s).add(p.id));
    this.api.swipe(p.id, 'LIKE').subscribe({
      next: (res) => {
        if (res.matched) this.match.set({ profile: p, matchId: res.matchId });
        else this.toast.show(`Liked ${this.first(p)} — you'll match if they like you back`);
      },
      error: (err) => {
        const msg: string = err?.error?.error || '';
        if (!msg.includes('already')) this.toast.error(err, 'Like failed — try again');
      },
    });
  }

  onSwipe(e: { profile: Profile; direction: SwipeDirection }) {
    this.seen.update((s) => new Set(s).add(e.profile.id));
    if (e.direction === 'LIKE') {
      this.like(e.profile);
    } else if (this.signedIn()) {
      this.api.swipe(e.profile.id, 'PASS').subscribe({ error: () => {} });
    }
  }

  fromSheet(direction: SwipeDirection) {
    const p = this.detail();
    this.detail.set(null);
    if (!p) return;
    if (this.mode() === 'swipe') this.onSwipe({ profile: p, direction });
    else if (direction === 'LIKE') this.like(p);
  }

  // ----- requests -----

  requestFrom(p: Profile) {
    this.detail.set(null);
    this.requesting.set(p);
  }

  /** Guest filled in a request: it's saved, now they need an account to send it. */
  onRequestNeedsAccount() {
    const p = this.requesting();
    this.requesting.set(null);
    if (!p) return;
    const first = this.first(p);
    this.prompts.open({
      heading: `Send your request to ${first}`,
      subheading: `Create a free account and we'll send it right away. ${first} will reply in Messages.`,
      cta: 'Create account & send',
      icon: 'calendar-plus',
    });
  }

  /** Signed-in homeowner: request sent, open the chat it created. */
  onRequested(p: Profile, matchId: number) {
    this.requesting.set(null);
    this.seen.update((s) => new Set(s).add(p.id));
    this.router.navigate(['/chat', matchId]);
  }

  onPendingClick() {
    const name = this.guestRequest.pending()?.cleanerName.split(' ')[0] ?? 'them';
    this.prompts.open({
      heading: `Send your request to ${name}`,
      subheading: `Create a free account and we'll send it right away. ${name} will reply in Messages.`,
      cta: 'Create account & send',
      icon: 'calendar-plus',
    });
  }

  askToSaveLikes(p?: Profile) {
    const first = p ? this.first(p) : null;
    const many = this.guestLikes.likes().length > 1 || !first;
    this.prompts.open({
      heading: first ? `You liked ${first}` : 'Save your likes',
      subheading: `Create a free account so ${many ? 'they' : first} can see it. You can chat as soon as it's a match.`,
      cta: 'Create account',
      icon: 'heart',
    });
  }

  openChat() {
    const m = this.match();
    this.match.set(null);
    this.router.navigate(m?.matchId ? ['/chat', m.matchId] : ['/messages']);
  }

  joinAsCleaner() {
    this.router.navigate(['/register'], { queryParams: { role: 'CLEANER' } });
  }

  startOver() {
    this.seen.set(new Set());
    this.category.set('All');
    if (this.signedIn()) {
      this.unswiped.set(null);
      this.loadUnswiped();
    }
  }

  // ----- view helpers -----

  rate(p: Profile) {
    return p.hourlyRate ? money(p.hourlyRate) : null;
  }

  first(p: Profile) {
    return p.name.split(' ')[0];
  }

  letters(p: Profile) {
    return initials(p.name);
  }

  fallbackBg(p: Profile) {
    const c = swatchFor(p.id || p.name);
    return `linear-gradient(160deg, color-mix(in srgb, ${c} 75%, white) 0%, ${c} 100%)`;
  }

  private iconFor(service: string) {
    return SERVICE_ICONS.find(([re]) => re.test(service))?.[1] ?? 'sparkles';
  }

  private loadUnswiped() {
    if (!this.signedIn() || this.unswiped() !== null) return;
    this.api.getSwipeProfiles().subscribe({
      next: (list) => this.unswiped.set(list),
      error: () => this.unswiped.set([]),
    });
  }

  private loadMode(): Mode {
    try {
      // Swipe is the first thing people see; the list is one tap away and remembered
      return localStorage.getItem(MODE_KEY) === 'browse' ? 'browse' : 'swipe';
    } catch {
      return 'swipe';
    }
  }
}
