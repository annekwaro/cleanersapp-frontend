import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input } from '@angular/core';
import { initials, money } from '../core/format';
import { PublicCleanersService } from '../core/services/public-cleaners.service';
import { IconComponent } from './icon.component';
import { swatchFor } from './avatar.component';

/**
 * Decorative fan of three real cleaner cards on a soft blob, with pass/like
 * buttons: a little preview of the swipe deck for welcome and log-in screens.
 */
@Component({
  selector: 'app-card-fan',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', 'aria-hidden': 'true' },
  template: `
    <div class="relative mx-auto w-full" [class]="compact() ? 'h-48 max-w-[15rem]' : 'h-64 max-w-[19rem]'">
      <div class="absolute inset-x-2 bottom-0 top-6 rounded-[45%_55%_50%_50%/55%_45%_55%_45%] bg-brand-200"></div>
      <div class="absolute -right-1 top-2 rounded-full bg-butter-300" [class]="compact() ? 'h-12 w-12' : 'h-16 w-16'"></div>
      @for (c of cards(); track c.id; let i = $index) {
        <div class="fan-card absolute left-1/2 top-3 overflow-hidden border-4 border-white shadow-[var(--shadow-lift)]"
          [class]="compact() ? 'h-40 w-28 rounded-[1.3rem]' : 'h-52 w-36 rounded-[1.6rem]'"
          [style.transform]="fan[i]" [style.zIndex]="i === 1 ? 3 : 1" [style.background]="bg(c)"
          [style.animation-delay.ms]="i === 1 ? 0 : 120">
          @if (c.photo) {
            <img [src]="c.photo" alt="" class="h-full w-full object-cover" (error)="$any($event.target).style.display = 'none'" />
          } @else {
            <!-- Back cards are mostly hidden, so their letters sit on the visible outer edge -->
            <span class="flex h-full items-center pb-8 font-display font-extrabold text-white/90"
              [class]="(compact() ? 'text-4xl ' : 'text-5xl ') + (i === 0 ? 'justify-start pl-3' : i === 2 ? 'justify-end pr-3' : 'justify-center')">{{ c.letters }}</span>
          }
          @if (i === 1) {
            <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-coal-950/80 to-transparent px-3 pb-3 pt-8 text-white">
              <p class="truncate font-display text-sm font-bold">{{ c.name }}</p>
              <p class="flex items-center gap-1 text-xs text-white/80">
                <app-icon name="star" [size]="11" [filled]="true" class="text-butter-300" />{{ c.rating }}
                @if (c.rate) { <span class="ml-auto font-semibold text-white">{{ c.rate }}/hr</span> }
              </p>
            </div>
          }
        </div>
      }
      <span class="fan-like absolute bottom-0 right-[12%] z-10 grid place-items-center rounded-full bg-brand-600 text-white shadow-[0_10px_24px_-8px_rgb(124_92_224/.8)]"
        [class]="compact() ? 'h-12 w-12' : 'h-14 w-14'">
        <app-icon name="heart" [size]="compact() ? 22 : 26" [filled]="true" />
      </span>
      <span class="fan-pass absolute bottom-1 left-[13%] z-10 grid place-items-center rounded-full bg-white text-clay-500 shadow-[var(--shadow-card)]"
        [class]="compact() ? 'h-10 w-10' : 'h-11 w-11'">
        <app-icon name="x" [size]="18" [stroke]="2.6" />
      </span>
    </div>`,
})
export class CardFanComponent implements OnInit {
  private cleaners = inject(PublicCleanersService);
  compact = input(false);

  fan = [
    'translateX(-95%) translateY(18px) rotate(-9deg)',
    'translateX(-50%)',
    'translateX(-5%) translateY(18px) rotate(9deg)',
  ];

  /** Three cards, photos first; placeholder names until cleaners have loaded. */
  cards = computed(() => {
    const list = [...this.cleaners.cleaners()].sort(
      (a, b) => +!!b.profilePicture - +!!a.profilePicture || (b.rating ?? 0) - (a.rating ?? 0)
    );
    const real = list.slice(0, 3).map((p) => ({
      id: p.id,
      name: p.name.split(' ')[0],
      photo: p.profilePicture,
      rating: p.rating ? p.rating.toFixed(1) : 'New',
      rate: p.hourlyRate ? money(p.hourlyRate) : null,
    }));
    const fill = ['Amara', 'Lucas', 'Grace'].map((name, i) => ({ id: -i - 1, name, photo: null as string | null, rating: '5.0', rate: null as string | null }));
    // The middle card sits in front, so the best one goes there
    const three = [...real, ...fill].slice(0, 3);
    return [three[1], three[0], three[2]].map((c) => ({ ...c, letters: initials(c.name) }));
  });

  ngOnInit() {
    this.cleaners.load();
  }

  bg(c: { id: number; name: string }) {
    const col = swatchFor(c.id > 0 ? c.id : c.name);
    return `linear-gradient(160deg, color-mix(in srgb, ${col} 75%, white) 0%, ${col} 100%)`;
  }
}
