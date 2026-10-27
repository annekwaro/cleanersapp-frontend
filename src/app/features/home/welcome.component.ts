import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PublicCleanersService } from '../../core/services/public-cleaners.service';
import { IconComponent } from '../../shared/icon.component';
import { LogoComponent } from '../../shared/logo.component';
import { AvatarComponent } from '../../shared/avatar.component';
import { CardFanComponent } from '../../shared/card-fan.component';

/**
 * First visit only: what CleanMatch is in one screen, then straight to the cards.
 * One column on phones; text left, cards right on wide screens.
 */
@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [RouterLink, IconComponent, LogoComponent, AvatarComponent, CardFanComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-wash fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div class="mx-auto flex min-h-full max-w-md flex-col px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 lg:max-w-5xl lg:px-10">
        <div class="flex items-center justify-between">
          <app-logo [size]="20" />
          <button type="button" class="text-sm font-semibold text-muted" (click)="done.emit()">Skip</button>
        </div>

        <div class="flex flex-1 flex-col lg:grid lg:grid-cols-2 lg:content-center lg:gap-x-16">
          <div class="rise lg:col-start-1">
            <h1 id="welcome-title" class="mt-8 text-[2.35rem] font-extrabold leading-[1.08] lg:mt-0 lg:text-6xl">
              Find a cleaner<br />you'll <span class="text-brand-600">love</span>
              <app-icon name="heart" [size]="30" [stroke]="2.2" class="ml-1 inline-block -rotate-12 align-[2px] text-brand-500" />
            </h1>
            <p class="mt-3 text-muted lg:mt-5 lg:text-lg">Swipe through local cleaners, book a time and chat — all free.</p>

            <!-- Social proof, from the same list the deck uses -->
            @if (proof(); as p) {
              <div class="mt-5 flex items-center gap-3">
                <div class="flex -space-x-2">
                  @for (c of p.faces; track c.id) {
                    <span class="rounded-full bg-white p-0.5"><app-avatar [name]="c.name" [src]="c.profilePicture" [seed]="c.id" [size]="32" /></span>
                  }
                </div>
                <p class="text-sm leading-tight">
                  <span class="font-bold">{{ p.count }} cleaners</span> ready to book
                  @if (p.avg) {
                    <span class="mt-0.5 flex items-center gap-1 text-muted">
                      <app-icon name="star" [size]="12" [filled]="true" class="text-butter-500" />{{ p.avg }} average rating
                    </span>
                  }
                </p>
              </div>
            }
          </div>

          <app-card-fan class="my-8 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:my-0 lg:self-center lg:origin-center lg:scale-125" />

          <!-- Swipe · Book · Chat -->
          <ul class="rise grid grid-cols-3 divide-x divide-line rounded-[1.6rem] bg-white py-4 shadow-[var(--shadow-card)] [animation-delay:150ms] lg:col-start-1 lg:mt-8">
            @for (s of steps; track s.title) {
              <li class="flex flex-col items-center px-1 text-center">
                <span class="grid h-11 w-11 place-items-center rounded-full" [class]="s.tone"><app-icon [name]="s.icon" [size]="20" /></span>
                <span class="mt-2 text-sm font-bold">{{ s.title }}</span>
                <span class="text-xs text-muted">{{ s.text }}</span>
              </li>
            }
          </ul>

          <div class="rise mt-auto pt-8 [animation-delay:250ms] lg:col-start-1 lg:mt-0">
            <button type="button" class="btn btn-primary w-full !py-4 text-base" (click)="done.emit()">
              Start swiping <app-icon name="chevron" [size]="18" />
            </button>
            <p class="mt-4 text-center text-sm text-muted lg:text-left">
              Already have an account? <a routerLink="/login" (click)="done.emit()" class="font-semibold text-brand-700">Log in</a>
            </p>
            <p class="mt-1.5 text-center text-sm text-muted lg:text-left">
              Clean for work? <button type="button" class="font-semibold text-brand-700" (click)="joinAsCleaner()">Join as a cleaner</button>
            </p>
          </div>
        </div>
      </div>
    </div>`,
})
export class WelcomeComponent {
  private router = inject(Router);
  private cleaners = inject(PublicCleanersService);
  done = output<void>();

  steps = [
    { icon: 'cards', title: 'Swipe', text: 'Like who fits', tone: 'bg-brand-100 text-brand-700' },
    { icon: 'calendar-plus', title: 'Book', text: 'Pick a time', tone: 'bg-butter-300/60 text-coal-900' },
    { icon: 'chat', title: 'Chat', text: 'Sort the details', tone: 'bg-clay-100 text-clay-500' },
  ];

  /** Faces, headcount and average rating; hidden until there are a few cleaners to show. */
  proof = computed(() => {
    const list = this.cleaners.cleaners();
    if (list.length < 3) return null;
    const rated = list.filter((c) => c.rating);
    const avg = rated.length ? (rated.reduce((a, c) => a + c.rating!, 0) / rated.length).toFixed(1) : null;
    const faces = [...list].sort((a, b) => +!!b.profilePicture - +!!a.profilePicture).slice(0, 4);
    return { count: list.length, avg, faces };
  });

  joinAsCleaner() {
    this.done.emit();
    this.router.navigate(['/register'], { queryParams: { role: 'CLEANER' } });
  }
}
