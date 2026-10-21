import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { GuestLikesService } from './guest-likes.service';
import { GuestRequestService } from './guest-request.service';
import { ToastService } from './toast.service';

/** What happens right after someone logs in or signs up, wherever they did it. */
@Injectable({ providedIn: 'root' })
export class PostAuthService {
  constructor(
    private auth: AuthService,
    private router: Router,
    private guestLikes: GuestLikesService,
    private guestRequest: GuestRequestService,
    private toast: ToastService
  ) {}

  continue(isNewAccount: boolean) {
    // Signed up from a tab (Bookings, Messages, Home)? Stay there. From /login or /register: go home.
    const onAuthPage = /^\/(login|register)/.test(this.router.url);
    const home = () => (onAuthPage ? this.router.navigate(['/']) : null);

    if (this.auth.isCleaner()) {
      // Things a cleaner did as a guest don't apply to them
      this.guestLikes.clear();
      this.guestRequest.clear();
      if (isNewAccount) this.router.navigate(['/profile'], { queryParams: { welcome: 1 } });
      else this.router.navigate(['/']);
      return;
    }

    this.guestLikes.flush().subscribe((matched) => {
      if (matched.length) this.toast.show(`It's a match with ${matched.join(', ')}!`);
    });

    if (!this.guestRequest.pending()) {
      home();
      return;
    }
    this.guestRequest.flush().subscribe({
      next: (r) => {
        if (!r) return home();
        this.toast.show(`Request sent to ${r.cleanerName.split(' ')[0]}`);
        return this.router.navigate(['/chat', r.matchId]);
      },
      error: (err) => {
        this.toast.error(err, 'Your request could not be sent — try again from their profile');
        home();
      },
    });
  }

}
