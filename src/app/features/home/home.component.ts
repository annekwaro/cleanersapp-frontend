import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { BrowseComponent } from '../browse/browse.component';
import { SwipeComponent } from '../swipe/swipe.component';

/** The Home tab: cleaners get their dashboard + homes to swipe; everyone else browses cleaners. */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [BrowseComponent, SwipeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (auth.isCleaner()) { <app-swipe /> } @else { <app-browse /> }`,
})
export class HomeComponent {
  auth = inject(AuthService);
}
