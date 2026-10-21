import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Profile } from '../core/models';
import { AvatarComponent } from './avatar.component';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-match-modal',
  standalone: true,
  imports: [AvatarComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scrim !items-center p-5" (click)="closed.emit()">
      <div class="pop-in w-full max-w-sm overflow-hidden rounded-[2rem] bg-forest-900 p-8 text-center text-cream-50"
        role="dialog" aria-modal="true" aria-label="It's a match" (click)="$event.stopPropagation()">
        <div class="mb-6 flex justify-center">
          <span class="-mr-4 rotate-[-8deg] rounded-full ring-4 ring-forest-900">
            <app-avatar [name]="myName()" [size]="96" seed="me" />
          </span>
          <span class="rotate-[8deg] rounded-full ring-4 ring-forest-900">
            <app-avatar [name]="other().name" [src]="other().profilePicture" [seed]="other().id" [size]="96" />
          </span>
        </div>
        <p class="eyebrow !text-sage-300">It's a match</p>
        <h2 class="mt-1 font-display text-3xl font-semibold">You & {{ other().name.split(' ')[0] }}</h2>
        <p class="mt-2 text-sm text-cream-50/70">You liked each other. Say hello and agree on a time.</p>
        <div class="mt-7 space-y-2.5">
          <button class="btn btn-primary w-full" (click)="chat.emit()"><app-icon name="chat" [size]="18" /> Send a message</button>
          <button class="btn w-full text-cream-50/80 hover:text-cream-50" (click)="closed.emit()">Keep swiping</button>
        </div>
      </div>
    </div>`,
})
export class MatchModalComponent {
  other = input.required<Profile>();
  myName = input('You');
  chat = output<void>();
  closed = output<void>();
}
