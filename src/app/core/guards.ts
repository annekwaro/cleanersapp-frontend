import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() || inject(Router).createUrlTree(['/login']);
};

/** Landing and auth pages: signed-in users go straight to the app. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return !auth.isLoggedIn() || inject(Router).createUrlTree(['/']);
};

export const cleanerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isCleaner() || inject(Router).createUrlTree(['/']);
};
