import { Routes } from '@angular/router';
import { authGuard, cleanerGuard, guestGuard } from './core/guards';
import { LandingComponent } from './features/landing/landing.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { ShellComponent } from './features/shell/shell.component';
import { SwipeComponent } from './features/swipe/swipe.component';
import { MatchesComponent } from './features/matches/matches.component';
import { ChatComponent } from './features/chat/chat.component';
import { ScheduleComponent } from './features/schedule/schedule.component';
import { EarningsComponent } from './features/earnings/earnings.component';
import { ProfileComponent } from './features/profile/profile.component';

export const routes: Routes = [
  // Public: browse first, sign up later
  { path: '', component: LandingComponent, canActivate: [guestGuard], title: 'CleanMatch — find a cleaner you click with' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard], title: 'Log in · CleanMatch' },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard], title: 'Sign up · CleanMatch' },

  // Chat is full-screen, outside the tab shell
  { path: 'app/chat/:matchId', component: ChatComponent, canActivate: [authGuard], title: 'Chat · CleanMatch' },
  {
    path: 'app',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'discover', pathMatch: 'full' },
      { path: 'discover', component: SwipeComponent, title: 'Discover · CleanMatch' },
      { path: 'chats', component: MatchesComponent, title: 'Chats · CleanMatch' },
      { path: 'schedule', component: ScheduleComponent, title: 'Schedule · CleanMatch' },
      { path: 'earnings', component: EarningsComponent, canActivate: [cleanerGuard], title: 'Earnings · CleanMatch' },
      { path: 'profile', component: ProfileComponent, title: 'Profile · CleanMatch' },
    ],
  },

  // Old URLs from the first version
  { path: 'swipe', redirectTo: 'app/discover' },
  { path: 'matches', redirectTo: 'app/chats' },
  { path: 'chat/:matchId', redirectTo: 'app/chat/:matchId' },
  { path: '**', redirectTo: '' },
];
