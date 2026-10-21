import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  Booking,
  BookingDraft,
  DirectRequestDraft,
  DirectRequestResult,
  Match,
  Message,
  Profile,
  ProfileUpdate,
  SwipeResult,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  // Your live Render backend
  private readonly API_URL = 'https://cleanersapp-backend.onrender.com/api';

  constructor(private http: HttpClient) {}

  // AUTH
  register(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/register`, data);
  }

  login(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/login`, data);
  }

  // PUBLIC (no login needed)
  getPublicCleaners(): Observable<Profile[]> {
    return this.http.get<Profile[]>(`${this.API_URL}/public/cleaners`).pipe(map((list) => list.map(normalizeProfile)));
  }

  // SWIPES
  getSwipeProfiles(): Observable<Profile[]> {
    return this.http.get<Profile[]>(`${this.API_URL}/swipe/profiles`).pipe(map((list) => list.map(normalizeProfile)));
  }

  swipe(targetId: number, direction: 'LIKE' | 'PASS'): Observable<SwipeResult> {
    return this.http.post<SwipeResult>(`${this.API_URL}/swipe/${targetId}?direction=${direction}`, {});
  }

  getMatches(): Observable<Match[]> {
    return this.http.get<Match[]>(`${this.API_URL}/matches`);
  }

  // CHAT
  sendMessage(matchId: number, content: string): Observable<Message> {
    return this.http.post<any>(`${this.API_URL}/chat/${matchId}`, { content }).pipe(map(normalizeMessage));
  }

  getMessages(matchId: number): Observable<Message[]> {
    return this.http.get<any[]>(`${this.API_URL}/chat/${matchId}`).pipe(map((list) => list.map(normalizeMessage)));
  }

  // PROFILE
  getMyProfile(): Observable<Profile> {
    return this.http.get<Profile>(`${this.API_URL}/profile/me`).pipe(map(normalizeProfile));
  }

  getProfile(userId: number): Observable<Profile> {
    return this.http.get<Profile>(`${this.API_URL}/profile/${userId}`).pipe(map(normalizeProfile));
  }

  updateProfile(data: ProfileUpdate): Observable<Profile> {
    return this.http.put<Profile>(`${this.API_URL}/profile/me`, data).pipe(map(normalizeProfile));
  }

  // BOOKINGS
  getBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.API_URL}/bookings`);
  }

  getMatchBookings(matchId: number): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.API_URL}/bookings/match/${matchId}`);
  }

  createBooking(draft: BookingDraft): Observable<Booking> {
    return this.http.post<Booking>(`${this.API_URL}/bookings`, draft);
  }

  createDirectRequest(draft: DirectRequestDraft): Observable<DirectRequestResult> {
    return this.http.post<DirectRequestResult>(`${this.API_URL}/bookings/direct`, draft);
  }

  confirmBooking(id: number): Observable<Booking> {
    return this.http.post<Booking>(`${this.API_URL}/bookings/${id}/confirm`, {});
  }

  declineBooking(id: number): Observable<Booking> {
    return this.http.post<Booking>(`${this.API_URL}/bookings/${id}/decline`, {});
  }

  cancelBooking(id: number, reason: string): Observable<Booking> {
    return this.http.post<Booking>(`${this.API_URL}/bookings/${id}/cancel`, { reason });
  }

  completeBooking(id: number): Observable<Booking> {
    return this.http.post<Booking>(`${this.API_URL}/bookings/${id}/complete`, {});
  }

  rateBooking(id: number, rating: number): Observable<Booking> {
    return this.http.post<Booking>(`${this.API_URL}/bookings/${id}/rate`, { rating });
  }
}

// Jackson serialises a Lombok `boolean isMine` as "mine", so accept both spellings.
function normalizeMessage(m: any): Message {
  return { ...m, isMine: m.isMine ?? m.mine ?? false };
}

// Older backend builds don't send the structured fields yet.
export function normalizeProfile(p: any): Profile {
  return {
    ...p,
    services: p.services ?? [],
    languages: p.languages ?? [],
    availableDays: p.availableDays ?? [],
    completedJobs: p.completedJobs ?? 0,
    acceptsDirectRequests: p.acceptsDirectRequests ?? false,
    profilePicture: p.profilePicture || null,
    bio: p.bio || null,
  };
}
