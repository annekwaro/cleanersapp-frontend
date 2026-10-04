import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

interface Match {
  matchId: number;
  otherUserId: number;
  otherUserName: string;
  otherUserEmail: string;
  otherUserRole: string;
  otherUserProfilePicture: string | null;
  matchedAt: string;
}

@Component({
  selector: 'app-matches',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './matches.component.html',
  styleUrl: './matches.component.css',
})
export class MatchesComponent implements OnInit {
  matches = signal<Match[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.loadMatches();
  }

  loadMatches() {
    this.loading.set(true);
    this.error.set(null);

    this.api.getMatches().subscribe({
      next: (data: Match[]) => {
        this.matches.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'Failed to load matches');
      },
    });
  }

  openChat(matchId: number) {
    this.router.navigate(['/chat', matchId]);
  }

  goBack() {
    this.router.navigate(['/swipe']);
  }

  logout() {
    // optional — leave empty or navigate to login
    this.router.navigate(['/login']);
  }
}
