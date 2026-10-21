import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { Profile } from '../core/models';
import { ProfileCardComponent } from './profile-card.component';
import { IconComponent } from './icon.component';

export type SwipeDirection = 'LIKE' | 'PASS';

const THRESHOLD = 110; // px of drag that counts as a decision
const FLING_MS = 280;

/**
 * Tinder-style card stack. Drag (mouse or touch), use the buttons, or the
 * arrow keys. Tapping a card without dragging opens its details.
 */
@Component({
  selector: 'app-swipe-deck',
  standalone: true,
  imports: [ProfileCardComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="relative mx-auto aspect-[3/4.1] w-full max-w-[24rem] max-h-[max(22rem,min(calc(100dvh-24rem),560px))]">
      @for (p of visible(); track p.id; let i = $index) {
        <div class="absolute inset-0 will-change-transform"
          [style.zIndex]="10 - i"
          [style.transform]="i === 0 ? topTransform() : stackTransform(i)"
          [style.transition]="i === 0 && dragging() ? 'none' : 'transform .28s cubic-bezier(.2,.8,.3,1), opacity .28s'"
          [style.opacity]="i === 2 ? 0.6 : 1"
          [style.touchAction]="i === 0 ? 'pan-y' : 'auto'"
          [style.cursor]="i === 0 ? (dragging() ? 'grabbing' : 'grab') : 'default'"
          (pointerdown)="i === 0 && onDown($event)"
          (pointermove)="i === 0 && onMove($event)"
          (pointerup)="i === 0 && onUp($event)"
          (pointercancel)="i === 0 && reset()">
          <app-profile-card [profile]="p" />
          @if (i === 0) {
            <span class="pointer-events-none absolute left-5 top-16 -rotate-12 rounded-xl border-4 border-sage-300 px-3 py-1 font-display text-3xl font-bold text-sage-300"
              [style.opacity]="likeOpacity()">LIKE</span>
            <span class="pointer-events-none absolute right-5 top-16 rotate-12 rounded-xl border-4 border-clay-100 px-3 py-1 font-display text-3xl font-bold text-clay-100"
              [style.opacity]="passOpacity()">PASS</span>
          }
        </div>
      }
    </div>

    @if (visible().length) {
      <div class="mt-6 flex items-center justify-center gap-5">
        <button type="button" (click)="fling('PASS')" aria-label="Pass"
          class="grid h-16 w-16 place-items-center rounded-full bg-white text-clay-500 shadow-[var(--shadow-card)] transition hover:scale-105 active:scale-95">
          <app-icon name="x" [size]="28" [stroke]="2.6" />
        </button>
        <button type="button" (click)="opened.emit(visible()[0])" aria-label="See details"
          class="grid h-12 w-12 place-items-center rounded-full bg-white text-forest-800 shadow-[var(--shadow-card)] transition hover:scale-105 active:scale-95">
          <app-icon name="info" [size]="20" />
        </button>
        <button type="button" (click)="fling('LIKE')" aria-label="Like"
          class="grid h-16 w-16 place-items-center rounded-full bg-sage-600 text-white shadow-[0_10px_24px_-8px_rgb(59_138_90/.7)] transition hover:scale-105 active:scale-95">
          <app-icon name="heart" [size]="28" [filled]="true" />
        </button>
      </div>
    }`,
})
export class SwipeDeckComponent {
  profiles = input.required<Profile[]>();
  swiped = output<{ profile: Profile; direction: SwipeDirection }>();
  opened = output<Profile>();

  visible = computed(() => this.profiles().slice(0, 3));

  dx = signal(0);
  dy = signal(0);
  dragging = signal(false);
  leaving = signal<SwipeDirection | null>(null);

  private startX = 0;
  private startY = 0;
  private startT = 0;
  private moved = false;
  private pointerId: number | null = null;

  topTransform = computed(() => {
    const leaving = this.leaving();
    if (leaving) {
      const sign = leaving === 'LIKE' ? 1 : -1;
      return `translate(${sign * (window.innerWidth + 200)}px, ${this.dy() + 40}px) rotate(${sign * 28}deg)`;
    }
    return `translate(${this.dx()}px, ${this.dy()}px) rotate(${this.dx() / 16}deg)`;
  });

  likeOpacity = computed(() => (this.leaving() === 'LIKE' ? 1 : Math.min(Math.max(this.dx() / THRESHOLD, 0), 1)));
  passOpacity = computed(() => (this.leaving() === 'PASS' ? 1 : Math.min(Math.max(-this.dx() / THRESHOLD, 0), 1)));

  stackTransform(i: number) {
    // Cards behind peek out a little, Linc-style, and grow as the top card is dragged away
    const progress = Math.min(Math.abs(this.dx()) / THRESHOLD, 1);
    const depth = Math.max(i - (this.leaving() ? 1 : progress), 0);
    const tilt = i % 2 ? -3 : 3;
    return `translateY(${depth * 14}px) scale(${1 - depth * 0.05}) rotate(${depth * tilt}deg)`;
  }

  onDown(e: PointerEvent) {
    if (this.leaving() || e.button > 0) return;
    this.pointerId = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startT = performance.now();
    this.moved = false;
    this.dragging.set(true);
  }

  onMove(e: PointerEvent) {
    if (e.pointerId !== this.pointerId) return;
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) this.moved = true;
    this.dx.set(dx);
    this.dy.set(dy * 0.35);
  }

  onUp(e: PointerEvent) {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.dragging.set(false);

    const dx = this.dx();
    const velocity = Math.abs(dx) / Math.max(performance.now() - this.startT, 1);
    if (Math.abs(dx) > THRESHOLD || (velocity > 0.6 && Math.abs(dx) > 40)) {
      this.fling(dx > 0 ? 'LIKE' : 'PASS');
      return;
    }
    if (!this.moved && this.visible()[0]) this.opened.emit(this.visible()[0]);
    this.reset();
  }

  reset() {
    this.pointerId = null;
    this.dragging.set(false);
    this.dx.set(0);
    this.dy.set(0);
  }

  fling(direction: SwipeDirection) {
    const top = this.visible()[0];
    if (!top || this.leaving()) return;
    this.leaving.set(direction);
    setTimeout(() => {
      this.leaving.set(null);
      this.dx.set(0);
      this.dy.set(0);
      this.swiped.emit({ profile: top, direction });
    }, FLING_MS);
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    if (target?.closest('input, textarea, select') || document.querySelector('[role="dialog"]')) return;
    if (e.key === 'ArrowRight') this.fling('LIKE');
    if (e.key === 'ArrowLeft') this.fling('PASS');
  }
}
