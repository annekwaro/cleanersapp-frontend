import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { User } from '../models';

export type { User } from '../models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'cleanersapp_token';
  private readonly USER_KEY = 'cleanersapp_user';

  currentUser = signal<User | null>(this.loadUserFromStorage());
  isCleaner = computed(() => this.currentUser()?.role === 'CLEANER');

  constructor(private api: ApiService, private router: Router) {}

  register(data: any) {
    return this.api
      .register(data)
      .pipe(tap((res: any) => this.handleAuthSuccess(res)));
  }

  login(data: any) {
    return this.api
      .login(data)
      .pipe(tap((res: any) => this.handleAuthSuccess(res)));
  }

  private handleAuthSuccess(res: any) {
    localStorage.setItem(this.TOKEN_KEY, res.token);
    const user: User = {
      email: res.email,
      name: res.name,
      role: res.role,
    };
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  private loadUserFromStorage(): User | null {
    try {
      const stored = localStorage.getItem(this.USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.currentUser();
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }
}
