import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

  getMe(): Observable<any> {
    return this.http.get(`${this.API_URL}/auth/me`);
  }

  // SWIPES
  getSwipeProfiles(): Observable<any> {
    return this.http.get(`${this.API_URL}/swipe/profiles`);
  }

  swipe(targetId: number, direction: 'LIKE' | 'PASS'): Observable<any> {
    return this.http.post(
      `${this.API_URL}/swipe/${targetId}?direction=${direction}`,
      {}
    );
  }

  getMatches(): Observable<any> {
    return this.http.get(`${this.API_URL}/matches`);
  }

  // CHAT
  sendMessage(matchId: number, content: string): Observable<any> {
    return this.http.post(`${this.API_URL}/chat/${matchId}`, { content });
  }

  getMessages(matchId: number): Observable<any> {
    return this.http.get(`${this.API_URL}/chat/${matchId}`);
  }

  // PROFILE
  getMyProfile(): Observable<any> {
    return this.http.get(`${this.API_URL}/profile/me`);
  }

  updateProfile(data: any): Observable<any> {
    return this.http.put(`${this.API_URL}/profile/me`, data);
  }
}
