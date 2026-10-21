import { Injectable, signal } from '@angular/core';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Profile } from '../models';

interface PendingLike {
  id: number;
  name: string;
}

/**
 * Visitors can swipe before they have an account. Their likes are kept in the
 * browser and sent to the backend right after they sign up or log in.
 */
@Injectable({ providedIn: 'root' })
export class GuestLikesService {
  private readonly KEY = 'cleanmatch_guest_likes';

  likes = signal<PendingLike[]>(this.load());

  constructor(private api: ApiService) {}

  add(profile: Profile) {
    if (this.likes().some((l) => l.id === profile.id)) return;
    this.likes.update((list) => [...list, { id: profile.id, name: profile.name }]);
    this.save();
  }

  clear() {
    this.likes.set([]);
    this.save();
  }

  /** Sends pending likes; emits the names of any that turned into matches. */
  flush(): Observable<string[]> {
    const pending = this.likes();
    this.likes.set([]);
    this.save();
    if (pending.length === 0) return of([]);

    return forkJoin(
      pending.map((like) =>
        this.api.swipe(like.id, 'LIKE').pipe(
          map((res) => (res.matched ? like.name : null)),
          catchError(() => of(null)) // already swiped, or the cleaner no longer exists
        )
      )
    ).pipe(map((names) => names.filter((n): n is string => !!n)));
  }

  private load(): PendingLike[] {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || '[]');
    } catch {
      return [];
    }
  }

  private save() {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this.likes()));
    } catch {
      // storage unavailable (private mode): likes just won't survive a reload
    }
  }
}
