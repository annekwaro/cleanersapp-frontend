import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-1.5' },
  template: `
    <span class="grid place-items-center rounded-xl bg-sage-600 text-white" [style.width.px]="size() * 1.25" [style.height.px]="size() * 1.25">
      <app-icon name="sparkles" [size]="size() * 0.75" [filled]="true" [stroke]="1.5" />
    </span>
    <span class="font-display font-bold tracking-tight text-forest-900" [style.fontSize.px]="size()">CleanMatch</span>`,
})
export class LogoComponent {
  size = input(22);
}
