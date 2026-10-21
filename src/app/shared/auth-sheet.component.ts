import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { PostAuthService } from '../core/services/post-auth.service';
import { IconComponent } from './icon.component';

/**
 * Sign up or log in without leaving the page, so whatever the visitor was
 * doing (a like, a booking request) is carried straight through.
 * Homeowners only; cleaners use the full sign-up page.
 */
@Component({
  selector: 'app-auth-sheet',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scrim" (click)="closed.emit()">
      <form class="sheet" role="dialog" aria-modal="true" [attr.aria-label]="heading()"
        (click)="$event.stopPropagation()" (ngSubmit)="submit()">
        <div class="sheet-grip"></div>
        <div class="mb-5 flex items-start justify-between gap-3">
          <div>
            <span class="mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-brand-700">
              <app-icon [name]="icon()" [size]="22" [filled]="icon() === 'heart'" />
            </span>
            <h2 class="font-display text-2xl font-semibold">{{ mode() === 'signup' ? heading() : 'Welcome back' }}</h2>
            <p class="mt-1 text-sm text-muted">{{ mode() === 'signup' ? subheading() : 'Log in and we\\'ll pick up right where you are.' }}</p>
          </div>
          <button type="button" class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white" (click)="closed.emit()" aria-label="Close">
            <app-icon name="x" [size]="18" />
          </button>
        </div>

        <div class="space-y-3">
          @if (mode() === 'signup') {
            <div>
              <label class="label" for="as-name">Your name</label>
              <input id="as-name" class="field" name="name" [(ngModel)]="name" autocomplete="name" placeholder="e.g. Jo Bennett" required />
            </div>
          }
          <div>
            <label class="label" for="as-email">Email</label>
            <input id="as-email" class="field" type="email" name="email" [(ngModel)]="email" autocomplete="email" placeholder="you@example.com" required />
          </div>
          <div>
            <label class="label" for="as-password">Password</label>
            <input id="as-password" class="field" type="password" name="password" [(ngModel)]="password"
              [attr.autocomplete]="mode() === 'signup' ? 'new-password' : 'current-password'"
              [placeholder]="mode() === 'signup' ? 'At least 6 characters' : '••••••••'" required />
          </div>
        </div>

        @if (error()) {
          <p class="mt-3 flex items-start gap-2 rounded-2xl bg-clay-100 p-3 text-sm text-clay-500" role="alert">
            <app-icon name="alert" [size]="18" /> {{ error() }}
          </p>
        }

        <button type="submit" class="btn btn-primary mt-5 w-full" [disabled]="loading()">
          {{ loading() ? 'One moment…' : mode() === 'signup' ? cta() : 'Log in' }}
        </button>

        <p class="mt-4 text-center text-sm text-muted">
          @if (mode() === 'signup') {
            Already have an account?
            <button type="button" class="font-semibold text-brand-700 hover:underline" (click)="switchMode('login')">Log in</button>
          } @else {
            New here?
            <button type="button" class="font-semibold text-brand-700 hover:underline" (click)="switchMode('signup')">Create an account</button>
          }
        </p>
        <p class="mt-2 text-center text-xs text-muted">
          Are you a cleaner? <a routerLink="/register" [queryParams]="{ role: 'CLEANER' }" class="font-semibold underline" (click)="closed.emit()">Join here</a>
        </p>
      </form>
    </div>`,
})
export class AuthSheetComponent {
  private auth = inject(AuthService);
  private postAuth = inject(PostAuthService);

  heading = input('Create your free account');
  subheading = input('Takes 30 seconds.');
  cta = input('Create account');
  icon = input('sparkles');
  closed = output<void>();

  mode = signal<'signup' | 'login'>('signup');
  loading = signal(false);
  error = signal<string | null>(null);
  name = '';
  email = '';
  password = '';

  switchMode(mode: 'signup' | 'login') {
    this.mode.set(mode);
    this.error.set(null);
  }

  submit() {
    this.error.set(null);
    const signup = this.mode() === 'signup';
    if (signup && !this.name.trim()) return this.error.set('Add your name so cleaners know who they are talking to.');
    if (signup && this.password.length < 6) return this.error.set('Use at least 6 characters for your password.');

    this.loading.set(true);
    const request = signup
      ? this.auth.register({ name: this.name.trim(), email: this.email.trim(), password: this.password, role: 'HOMEOWNER' })
      : this.auth.login({ email: this.email.trim(), password: this.password });

    request.subscribe({
      next: () => {
        this.loading.set(false);
        this.closed.emit();
        this.postAuth.continue(signup);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || (signup ? 'Sign up failed — check your connection and try again.' : 'Login failed.'));
      },
    });
  }
}
