import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, retry, shareReplay, timer } from 'rxjs';
import { ApiService, normalizeProfile } from './api.service';
import { Profile } from '../models';

/**
 * The public cleaner list, shown without waiting on the backend.
 *
 * 1. Instantly: whatever this browser saw last time, or the snapshot baked
 *    into the build (assets/cleaners-snapshot.json, served by Vercel's CDN).
 * 2. Then: the live list, retried while Render wakes up, which replaces it.
 */
@Injectable({ providedIn: 'root' })
export class PublicCleanersService {
  private readonly CACHE_KEY = 'cleanmatch_public_cleaners';

  cleaners = signal<Profile[]>([]);
  /** True once we have something to show, from any source. */
  ready = signal(false);
  /** True once the live list has arrived. */
  live = signal(false);
  failed = signal(false);

  private live$?: Observable<Profile[] | null>;

  constructor(private api: ApiService, private http: HttpClient) {}

  load() {
    if (!this.ready()) this.showInstant();
    this.fetchLive().subscribe((list) => {
      if (list) {
        this.cleaners.set(this.merge(this.cleaners(), list));
        this.live.set(true);
        this.saveCache(list);
      } else if (!this.cleaners().length) {
        this.failed.set(true);
      }
      this.ready.set(true);
    });
  }

  /** Fire-and-forget call so Render starts waking as soon as anyone opens the app. */
  warmUp() {
    this.fetchLive().subscribe();
  }

  private fetchLive(): Observable<Profile[] | null> {
    this.live$ ??= this.api.getPublicCleaners().pipe(
      // Cold starts can take ~a minute: try a few times before giving up
      retry({ count: 3, delay: (_, n) => timer(n * 4000) }),
      catchError(() => of(null)),
      shareReplay(1)
    );
    return this.live$;
  }

  private showInstant() {
    const cached = this.readCache();
    if (cached.length) {
      this.cleaners.set(cached);
      this.ready.set(true);
      return;
    }
    this.http.get<any[]>('assets/cleaners-snapshot.json').pipe(catchError(() => of([]))).subscribe((list) => {
      if (!this.live() && list.length) {
        this.cleaners.set(list.map(normalizeProfile));
        this.ready.set(true);
      }
    });
  }

  /**
   * Keep the order the visitor is already looking at (so the top card doesn't
   * jump), refresh each card's details, drop removed cleaners, append new ones.
   */
  private merge(current: Profile[], fresh: Profile[]): Profile[] {
    const byId = new Map(fresh.map((p) => [p.id, p]));
    const kept = current.filter((p) => byId.has(p.id)).map((p) => byId.get(p.id)!);
    const keptIds = new Set(kept.map((p) => p.id));
    return [...kept, ...fresh.filter((p) => !keptIds.has(p.id))];
  }

  private readCache(): Profile[] {
    try {
      const raw = JSON.parse(localStorage.getItem(this.CACHE_KEY) || '[]');
      return Array.isArray(raw) ? raw.map(normalizeProfile) : [];
    } catch {
      return [];
    }
  }

  private saveCache(list: Profile[]) {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(list));
    } catch {
      // storage full or blocked: the snapshot still covers next time
    }
  }
}
