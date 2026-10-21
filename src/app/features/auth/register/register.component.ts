import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { GuestLikesService } from '../../../core/services/guest-likes.service';
import { PostAuthService } from '../../../core/services/post-auth.service';
import { GuestRequestService } from '../../../core/services/guest-request.service';
import { Role } from '../../../core/models';
import { LogoComponent } from '../../../shared/logo.component';
import { IconComponent } from '../../../shared/icon.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, LogoComponent, IconComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  guestLikes = inject(GuestLikesService);
  guestRequest = inject(GuestRequestService);
  private postAuth = inject(PostAuthService);

  email = '';
  password = '';
  name = '';
  role = signal<Role>('HOMEOWNER');
  hourlyRate: number | null = null;
  error = signal<string | null>(null);
  loading = signal(false);

  ngOnInit() {
    const role = this.route.snapshot.queryParamMap.get('role');
    if (role === 'CLEANER' || role === 'HOMEOWNER') this.role.set(role);
  }

  onSubmit() {
    this.error.set(null);
    if (this.password.length < 6) {
      this.error.set('Use at least 6 characters for your password.');
      return;
    }
    if (this.role() === 'CLEANER' && !this.hourlyRate) {
      this.error.set('Set an hourly rate — you can change it any time.');
      return;
    }

    this.loading.set(true);
    const payload: any = {
      email: this.email.trim(),
      password: this.password,
      name: this.name.trim(),
      role: this.role(),
    };
    if (this.role() === 'CLEANER') {
      payload.hourlyRate = this.hourlyRate;
    }

    this.auth.register(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.postAuth.continue(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'Sign up failed. Check your connection and try again.');
      },
    });
  }
}
