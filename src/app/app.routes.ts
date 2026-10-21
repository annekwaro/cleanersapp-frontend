import { Routes } from '@angular/router';
import { authGuard, cleanerGuard, guestGuard } from './core/guards';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { ShellComponent } from './features/shell/shell.component';
import { HomeComponent } from './features/home/home.component';
import { MatchesComponent } from './features/matches/matches.component';
import { ChatComponent } from './features/chat/chat.component';
import { ScheduleComponent } from './features/schedule/schedule.component';
import { EarningsComponent } from './features/earnings/earnings.component';
import { ProfileComponent } from './features/profile/profile.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard], title: 'Log in · CleanMatch' },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard], title: 'Sign up · CleanMatch' },

  // Chat is full-screen, outside the tab shell
  { path: 'chat/:matchId', component: ChatComponent, canActivate: [authGuard], title: 'Chat · CleanMatch' },

  // Old URLs
  { path: 'app', redirectTo: '', pathMatch: 'full' },
  { path: 'app/discover', redirectTo: '' },
  { path: 'app/chats', redirectTo: 'messages' },
  { path: 'app/schedule', redirectTo: 'bookings' },
  { path: 'app/earnings', redirectTo: 'earnings' },
  { path: 'app/profile', redirectTo: 'profile' },
  { path: 'app/chat/:matchId', redirectTo: 'chat/:matchId' },
  { path: 'swipe', redirectTo: '' },
  { path: 'matches', redirectTo: 'messages' },

  // Three tabs — open to everyone; guests get a sign-up prompt where an account is needed
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', component: HomeComponent, title: 'CleanMatch — find a cleaner you\'ll love' },
      { path: 'bookings', component: ScheduleComponent, title: 'Bookings · CleanMatch' },
      { path: 'messages', component: MatchesComponent, title: 'Messages · CleanMatch' },
      { path: 'earnings', component: EarningsComponent, canActivate: [authGuard, cleanerGuard], title: 'Earnings · CleanMatch' },
      { path: 'profile', component: ProfileComponent, canActivate: [authGuard], title: 'Profile · CleanMatch' },
    ],
  },
  { path: '**', redirectTo: '' },
];
