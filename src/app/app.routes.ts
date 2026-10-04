import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { SwipeComponent } from './features/swipe/swipe.component';
import { MatchesComponent } from './features/matches/matches.component';
import { ChatComponent } from './features/chat/chat.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'swipe', component: SwipeComponent },
  { path: 'matches', component: MatchesComponent },
  { path: 'chat/:matchId', component: ChatComponent },
];
