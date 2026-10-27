import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BrowseComponent } from '../browse/browse.component';
import { SwipeComponent } from '../swipe/swipe.component';
import { WelcomeComponent } from './welcome.component';

const WELCOMED_KEY = 'cleanmatch_welcomed';

/** The Home tab: cleaners get their dashboard + homes to swipe; everyone else browses cleaners. */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [BrowseComponent, SwipeComponent, WelcomeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (auth.isCleaner()) { <app-swipe /> } @else { <app-browse /> }
    @if (showWelcome()) { <app-welcome (done)="dismiss()" /> }`,
})
export class HomeComponent {
  auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  // First visit only, and never when someone arrives on a shared cleaner link
  private welcomed = signal(this.seen() || this.route.snapshot.queryParamMap.has('cleaner'));
  showWelcome = computed(() => !this.welcomed() && !this.auth.currentUser());

  dismiss() {
    this.welcomed.set(true);
    try {
      localStorage.setItem(WELCOMED_KEY, '1');
    } catch {
      // shows again next visit; harmless
    }
  }

  private seen() {
    try {
      return !!localStorage.getItem(WELCOMED_KEY);
    } catch {
      return true;
    }
  }
}
