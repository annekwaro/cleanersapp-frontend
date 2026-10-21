import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BookingsStore } from '../../core/services/bookings.store';
import { IconComponent } from '../../shared/icon.component';
import { LogoComponent } from '../../shared/logo.component';
import { AvatarComponent } from '../../shared/avatar.component';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  badge?: number;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, LogoComponent, AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-wash min-h-dvh">
      <header class="sticky top-0 z-40 border-b border-line/60 bg-cream-100/80 backdrop-blur-md">
        <div class="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <a routerLink="/app/discover" aria-label="CleanMatch home"><app-logo [size]="20" /></a>
          <nav class="hidden md:block" aria-label="Main">
            <ul class="flex items-center gap-1 rounded-full bg-white p-1.5 shadow-[var(--shadow-card)]">
              @for (item of nav(); track item.path) {
                <li>
                  <a [routerLink]="item.path" routerLinkActive="!bg-sage-600 !text-white"
                    class="relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-forest-800 transition hover:bg-cream-100">
                    <app-icon [name]="item.icon" [size]="18" />{{ item.label }}
                    @if (item.badge) { <span class="grid h-5 min-w-5 place-items-center rounded-full bg-clay-500 px-1 text-[0.7rem] text-white">{{ item.badge }}</span> }
                  </a>
                </li>
              }
            </ul>
          </nav>
          <a routerLink="/app/profile" class="flex items-center gap-2 rounded-full p-1 pr-1 transition hover:bg-white md:pr-3" aria-label="Your profile">
            <app-avatar [name]="auth.currentUser()?.name || ''" [size]="36" seed="me" />
            <span class="hidden text-sm font-semibold md:inline">{{ firstName() }}</span>
          </a>
        </div>
      </header>

      <main class="mx-auto max-w-5xl px-4 pb-32 pt-5 sm:px-6 md:pb-12">
        <router-outlet />
      </main>

      <!-- Mobile: floating pill tab bar -->
      <nav class="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden" aria-label="Main">
        <ul class="mx-auto flex max-w-md items-center justify-between rounded-full bg-white/95 p-1.5 shadow-[var(--shadow-lift)] backdrop-blur">
          @for (item of nav(); track item.path) {
            <li>
              <a [routerLink]="item.path" routerLinkActive #rla="routerLinkActive" [attr.aria-label]="item.label"
                class="relative flex h-12 items-center justify-center gap-2 rounded-full text-forest-800 transition-all"
                [class]="rla.isActive ? 'bg-sage-600 px-4 text-white' : 'w-12'">
                <app-icon [name]="item.icon" [size]="21" />
                @if (rla.isActive) { <span class="text-sm font-semibold">{{ item.label }}</span> }
                @if (item.badge) {
                  <span class="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-clay-500 px-1 text-[0.65rem] font-bold text-white">{{ item.badge }}</span>
                }
              </a>
            </li>
          }
        </ul>
      </nav>
    </div>`,
})
export class ShellComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  private store = inject(BookingsStore);
  private poll: any = null;

  firstName = computed(() => (this.auth.currentUser()?.name || '').split(' ')[0]);

  nav = computed<NavItem[]>(() => {
    const pending = this.store.needsReply().length;
    if (this.auth.isCleaner()) {
      return [
        { path: '/app/discover', label: 'Discover', icon: 'compass' },
        { path: '/app/chats', label: 'Chats', icon: 'chat' },
        { path: '/app/schedule', label: 'Schedule', icon: 'calendar', badge: pending },
        { path: '/app/earnings', label: 'Earnings', icon: 'wallet' },
      ];
    }
    return [
      { path: '/app/discover', label: 'Discover', icon: 'compass' },
      { path: '/app/chats', label: 'Chats', icon: 'chat' },
      { path: '/app/schedule', label: 'Bookings', icon: 'calendar', badge: pending },
      { path: '/app/profile', label: 'Profile', icon: 'user' },
    ];
  });

  ngOnInit() {
    this.store.refresh();
    this.poll = setInterval(() => this.store.refresh(), 30000);
  }

  ngOnDestroy() {
    clearInterval(this.poll);
    this.store.clear();
  }
}
