import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

interface Profile {
  id: number;
  name: string;
  role: string;
  bio: string;
  hourlyRate: number;
  rating: number;
  profilePicture: string;
}

@Component({
  selector: 'app-swipe',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './swipe.component.html',
  styleUrl: './swipe.component.css',
})
export class SwipeComponent implements OnInit {
  profiles = signal<Profile[]>([]);
  currentIndex = signal(0);
  loading = signal(true);
  error = signal<string | null>(null);

  // For swipe animation
  swipeDirection = signal<'LEFT' | 'RIGHT' | null>(null);

  // Match popup
  showMatchPopup = signal(false);
  matchedWith = signal<Profile | null>(null);

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadProfiles();
  }

  loadProfiles() {
    this.loading.set(true);
    this.error.set(null);

    this.api.getSwipeProfiles().subscribe({
      next: (data: Profile[]) => {
        this.profiles.set(data);
        this.currentIndex.set(0);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'Failed to load profiles');
      },
    });
  }

  get currentProfile(): Profile | null {
    const list = this.profiles();
    const idx = this.currentIndex();
    return idx < list.length ? list[idx] : null;
  }

  get hasMoreProfiles(): boolean {
    return this.currentIndex() < this.profiles().length;
  }

  swipe(direction: 'LIKE' | 'PASS') {
    const profile = this.currentProfile;
    if (!profile) return;

    // Trigger animation
    this.swipeDirection.set(direction === 'LIKE' ? 'RIGHT' : 'LEFT');

    // Call API
    this.api.swipe(profile.id, direction).subscribe({
      next: (res: any) => {
        // Move to next profile after animation
        setTimeout(() => {
          this.swipeDirection.set(null);
          this.currentIndex.update((i) => i + 1);

          // If it was a match, show popup
          if (res.matched) {
            this.matchedWith.set(profile);
            this.showMatchPopup.set(true);
          }
        }, 300);
      },
      error: (err) => {
        this.swipeDirection.set(null);
        this.error.set(err?.error?.error || 'Swipe failed');
      },
    });
  }

  closeMatchPopup() {
    this.showMatchPopup.set(false);
    this.matchedWith.set(null);
  }

  goToMatches() {
    this.closeMatchPopup();
    this.router.navigate(['/matches']);
  }

  logout() {
    this.auth.logout();
  }
}
