import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { initials } from '../core/format';

export const SWATCHES = ['#3b8a5a', '#c9a23a', '#285039', '#7d9c6b', '#b8744f'];

export function swatchFor(seed: number | string): string {
  const n = typeof seed === 'number' ? seed : [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  return SWATCHES[Math.abs(n) % SWATCHES.length];
}

@Component({
  selector: 'app-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  template: `
    <span class="relative inline-flex items-center justify-center overflow-hidden rounded-full font-display font-semibold text-white"
      [style.width.px]="size()" [style.height.px]="size()" [style.fontSize.px]="size() * 0.38"
      [style.background]="color()">
      @if (src() && !broken()) {
        <img [src]="src()" [alt]="name()" class="h-full w-full object-cover" (error)="broken.set(true)" />
      } @else {
        {{ letters() }}
      }
    </span>`,
})
export class AvatarComponent {
  name = input('');
  src = input<string | null>(null);
  size = input(44);
  seed = input<number | string>(0);

  broken = signal(false);
  letters = computed(() => initials(this.name()));
  color = computed(() => swatchFor(this.seed() || this.name()));
}
