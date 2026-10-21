import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthPromptService } from '../core/services/auth-prompt.service';
import { GuestLikesService } from '../core/services/guest-likes.service';
import { GuestRequestService } from '../core/services/guest-request.service';
import { IconComponent } from './icon.component';

/** What a guest sees on a tab that needs an account: what it's for, and one way in. */
@Component({
  selector: 'app-guest-gate',
  standalone: true,
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-md pt-2">
      <h1 class="font-display text-3xl font-bold">{{ title() }}</h1>

      @if (guestRequest.pending(); as pr) {
        <button type="button" (click)="sendPending(pr.cleanerName)"
          class="mt-5 flex w-full items-center gap-3 rounded-3xl bg-butter-300/70 p-4 text-left text-sm">
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white"><app-icon name="calendar-plus" [size]="20" /></span>
          <span class="flex-1"><strong>Your request to {{ pr.cleanerName.split(' ')[0] }} is ready.</strong><br />Create an account to send it.</span>
          <app-icon name="chevron" [size]="18" />
        </button>
      }

      <div class="card mt-5 overflow-hidden">
        <div class="relative grid h-44 place-items-center overflow-hidden bg-brand-100">
          <div class="absolute -left-6 -top-8 h-32 w-32 rounded-full bg-brand-200/70"></div>
          <div class="absolute -bottom-10 right-4 h-28 w-28 rounded-full bg-butter-300/60"></div>
          <span class="relative grid h-20 w-20 place-items-center rounded-[1.75rem] bg-white text-brand-600 shadow-[var(--shadow-card)]">
            <app-icon [name]="icon()" [size]="36" />
          </span>
        </div>
        <div class="p-6 text-center">
          <h2 class="text-xl font-bold">{{ heading() }}</h2>
          <p class="mt-2 text-sm text-muted">{{ text() }}</p>
          <ul class="mt-5 space-y-2.5 text-left text-sm">
            @for (point of points(); track point) {
              <li class="flex items-start gap-3">
                <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-600 text-white"><app-icon name="check" [size]="12" [stroke]="3" /></span>
                {{ point }}
              </li>
            }
          </ul>
          <button type="button" class="btn btn-primary mt-6 w-full" (click)="signUp()">Create free account</button>
          <p class="mt-3 text-sm text-muted">
            Already have one? <a routerLink="/login" class="font-semibold text-brand-700 hover:underline">Log in</a>
          </p>
        </div>
      </div>

      <a routerLink="/" class="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-coal-800">
        <app-icon name="search" [size]="16" /> Keep browsing cleaners
      </a>
    </div>`,
})
export class GuestGateComponent {
  private prompts = inject(AuthPromptService);
  guestRequest = inject(GuestRequestService);
  private guestLikes = inject(GuestLikesService);

  title = input.required<string>();
  icon = input('sparkles');
  heading = input.required<string>();
  text = input.required<string>();
  points = input<string[]>([]);

  signUp() {
    const liked = this.guestLikes.likes().length;
    this.prompts.open(
      liked ? { subheading: `We'll send your ${liked} like${liked > 1 ? 's' : ''} as soon as you're in.` } : {}
    );
  }

  sendPending(name: string) {
    const first = name.split(' ')[0];
    this.prompts.open({
      heading: `Send your request to ${first}`,
      subheading: `Create a free account and we'll send it right away. ${first} will reply in Messages.`,
      cta: 'Create account & send',
      icon: 'calendar-plus',
    });
  }
}
