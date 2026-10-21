import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AuthPromptService } from '../../core/services/auth-prompt.service';
import { BookingsStore } from '../../core/services/bookings.store';
import { money, toDate } from '../../core/format';
import { IconComponent } from '../../shared/icon.component';
import { LogoComponent } from '../../shared/logo.component';
import { AvatarComponent } from '../../shared/avatar.component';
import { AuthSheetComponent } from '../../shared/auth-sheet.component';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  badge?: number;
}

/**
 * The app frame: three tabs (Home, Bookings/Schedule, Messages) for everyone,
 * guests included. Profile lives behind the avatar in the header.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, LogoComponent, AvatarComponent, AuthSheetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-wash min-h-dvh">
      <header class="sticky top-0 z-40 bg-brand-100/80 backdrop-blur-md">
        <div class="mx-auto flex h-[4.5rem] max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          @if (auth.currentUser(); as user) {
            <a routerLink="/profile" class="flex min-w-0 items-center gap-3 rounded-full pr-2" aria-label="Your profile">
              <app-avatar [name]="user.name" [size]="44" seed="me" />
              <span class="min-w-0 leading-tight">
                <span class="block text-xs text-muted">{{ greeting() }},</span>
                <span class="block truncate font-bold">{{ firstName() }}</span>
              </span>
            </a>
          } @else {
            <a routerLink="/" aria-label="CleanMatch home"><app-logo [size]="20" /></a>
          }

          <nav class="hidden md:block" aria-label="Main">
            <ul class="flex items-center gap-1 rounded-full bg-white p-1.5 shadow-[var(--shadow-card)]">
              @for (item of nav(); track item.path) {
                <li>
                  <a [routerLink]="item.path" routerLinkActive="!bg-brand-600 !text-white" [routerLinkActiveOptions]="{ exact: item.path === '/' }"
                    class="relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-coal-800 transition hover:bg-cream-100">
                    <app-icon [name]="item.icon" [size]="18" />{{ item.label }}
                    @if (item.badge) { <span class="grid h-5 min-w-5 place-items-center rounded-full bg-clay-500 px-1 text-[0.7rem] text-white">{{ item.badge }}</span> }
                  </a>
                </li>
              }
            </ul>
          </nav>

          <div class="flex shrink-0 items-center gap-2">
            @if (!auth.currentUser()) {
              <a routerLink="/login" class="btn btn-ghost btn-sm">Log in</a>
              <button type="button" class="btn btn-dark btn-sm hidden sm:inline-flex" (click)="prompts.open()">Sign up</button>
            } @else if (auth.isCleaner()) {
              <a routerLink="/earnings" class="chip chip-light !py-2 shadow-[var(--shadow-card)]" aria-label="Earned this month">
                <app-icon name="wallet" [size]="16" class="text-brand-600" /> {{ monthEarnings() }}
              </a>
            } @else {
              <a routerLink="/profile" class="grid h-11 w-11 place-items-center rounded-full bg-white shadow-[var(--shadow-card)]" aria-label="Profile and settings">
                <app-icon name="user" [size]="20" />
              </a>
            }
          </div>
        </div>
      </header>

      <main class="mx-auto max-w-5xl px-4 pb-32 pt-3 sm:px-6 md:pb-12">
        <router-outlet />
      </main>

      <!-- Mobile tab bar -->
      <nav class="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden" aria-label="Main">
        <ul class="mx-auto grid max-w-md grid-cols-3 rounded-[1.75rem] bg-white/95 p-1.5 shadow-[var(--shadow-lift)] backdrop-blur">
          @for (item of nav(); track item.path) {
            <li>
              <a [routerLink]="item.path" routerLinkActive #rla="routerLinkActive" [routerLinkActiveOptions]="{ exact: item.path === '/' }"
                class="relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-[1.4rem] text-xs font-semibold transition"
                [class]="rla.isActive ? 'bg-brand-100 text-brand-700' : 'text-muted'">
                <app-icon [name]="item.icon" [size]="22" [stroke]="rla.isActive ? 2.4 : 2" />
                {{ item.label }}
                @if (item.badge) {
                  <span class="absolute right-[calc(50%-1.4rem)] top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-clay-500 px-1 text-[0.65rem] font-bold text-white">{{ item.badge }}</span>
                }
              </a>
            </li>
          }
        </ul>
      </nav>
    </div>

    @if (prompts.prompt(); as a) {
      <app-auth-sheet [heading]="a.heading" [subheading]="a.subheading" [cta]="a.cta" [icon]="a.icon" (closed)="prompts.close()" />
    }`,
})
export class ShellComponent implements OnDestroy {
  auth = inject(AuthService);
  prompts = inject(AuthPromptService);
  private store = inject(BookingsStore);
  private poll: any = null;

  firstName = computed(() => (this.auth.currentUser()?.name || '').split(' ')[0]);

  greeting = computed(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  });

  monthEarnings = computed(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const sum = this.store
      .bookings()
      .filter((b) => b.status === 'COMPLETED' && toDate(b.startAt) >= from)
      .reduce((s, b) => s + b.totalAmount, 0);
    return money(sum);
  });

  nav = computed<NavItem[]>(() => {
    const pending = this.store.needsReply().length;
    const cleaner = this.auth.isCleaner();
    return [
      { path: '/', label: 'Home', icon: 'home' },
      { path: '/bookings', label: cleaner ? 'Schedule' : 'Bookings', icon: 'calendar', badge: pending },
      { path: '/messages', label: 'Messages', icon: 'chat' },
    ];
  });

  constructor() {
    // Bookings feed the badge and the earnings pill; only for signed-in users,
    // and the shell stays mounted when someone signs up from inside it.
    effect(() => {
      clearInterval(this.poll);
      if (this.auth.currentUser()) {
        this.store.refresh();
        this.poll = setInterval(() => this.store.refresh(), 30000);
      } else {
        this.store.clear();
      }
    }, { allowSignalWrites: true });
  }

  ngOnDestroy() {
    clearInterval(this.poll);
  }
}
