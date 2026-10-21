import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { Profile } from '../core/models';
import { initials, money } from '../core/format';
import { IconComponent } from './icon.component';
import { swatchFor } from './avatar.component';

/** The photo-first card used in the swipe deck and the profile preview. */
@Component({
  selector: 'app-profile-card',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full w-full' },
  template: `
    <article class="relative h-full w-full overflow-hidden rounded-[2rem] bg-forest-900 select-none"
      [style.boxShadow]="'var(--shadow-lift)'">
      @if (p().profilePicture && !broken()) {
        <img [src]="p().profilePicture" [alt]="p().name" draggable="false"
          class="absolute inset-0 h-full w-full object-cover pointer-events-none" (error)="broken.set(true)" />
      } @else {
        <div class="absolute inset-0" [style.background]="fallbackBg()">
          <div class="absolute inset-0 opacity-25"
            style="background-image: radial-gradient(rgb(255 255 255 / .5) 1px, transparent 1px); background-size: 18px 18px"></div>
          <span class="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 font-display text-[7.5rem] font-semibold leading-none text-white/90">
            {{ letters() }}
          </span>
        </div>
      }

      <!-- top pills -->
      <div class="absolute inset-x-0 top-0 flex items-start justify-between p-4">
        @if (isCleaner()) {
          <span class="chip !bg-white/95 !text-forest-900 shadow-sm">
            <app-icon name="star" [size]="14" [filled]="true" class="text-butter-500" />
            {{ p().rating ? p().rating!.toFixed(1) : 'New' }}
            @if (p().completedJobs) { <span class="font-medium text-muted">· {{ p().completedJobs }} jobs</span> }
          </span>
          @if (p().hourlyRate) {
            <span class="chip !bg-sage-600 !text-white shadow-sm">{{ rate() }}<span class="font-medium opacity-80">/h</span></span>
          }
        } @else {
          <span class="chip !bg-white/95 !text-forest-900 shadow-sm">
            <app-icon name="home" [size]="14" /> Home
          </span>
        }
      </div>

      <!-- bottom info -->
      <div class="absolute inset-x-0 bottom-0 p-5 pt-24 text-white"
        style="background: linear-gradient(to top, rgb(15 28 21 / .92) 10%, rgb(15 28 21 / .55) 60%, transparent)">
        <h2 class="font-display text-3xl font-semibold leading-tight">{{ p().name }}</h2>
        @if (p().headline) {
          <p class="mt-1 text-[0.95rem] font-medium text-white/90 line-clamp-2">{{ p().headline }}</p>
        }
        <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
          @if (p().serviceArea) {
            <span class="inline-flex items-center gap-1.5"><app-icon name="pin" [size]="15" />{{ p().serviceArea }}</span>
          }
          @if (p().yearsExperience) {
            <span class="inline-flex items-center gap-1.5"><app-icon name="briefcase" [size]="15" />{{ p().yearsExperience }} yrs</span>
          }
          @if (p().petFriendly) {
            <span class="inline-flex items-center gap-1.5"><app-icon name="paw" [size]="15" />{{ isCleaner() ? 'Pet friendly' : 'Has pets' }}</span>
          }
        </div>
        @if (p().services.length) {
          <div class="mt-3 flex flex-wrap gap-1.5">
            @for (s of p().services.slice(0, 3); track s) { <span class="chip chip-glass">{{ s }}</span> }
            @if (p().services.length > 3) { <span class="chip chip-glass">+{{ p().services.length - 3 }}</span> }
          </div>
        } @else if (p().bio) {
          <p class="mt-3 text-sm text-white/80 line-clamp-2">{{ p().bio }}</p>
        }
      </div>
    </article>`,
})
export class ProfileCardComponent {
  p = input.required<Profile>({ alias: 'profile' });

  broken = signal(false);
  isCleaner = computed(() => this.p().role === 'CLEANER');
  letters = computed(() => initials(this.p().name));
  rate = computed(() => money(this.p().hourlyRate));
  fallbackBg = computed(() => {
    const c = swatchFor(this.p().id || this.p().name);
    return `linear-gradient(160deg, ${c} 0%, color-mix(in srgb, ${c} 70%, #0f1c15) 100%)`;
  });
}
