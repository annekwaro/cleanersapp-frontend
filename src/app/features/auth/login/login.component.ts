import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { GuestLikesService } from '../../../core/services/guest-likes.service';
import { ToastService } from '../../../core/services/toast.service';
import { LogoComponent } from '../../../shared/logo.component';
import { IconComponent } from '../../../shared/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, LogoComponent, IconComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private guestLikes = inject(GuestLikesService);
  private toast = inject(ToastService);

  email = '';
  password = '';
  error = signal<string | null>(null);
  loading = signal(false);

  onSubmit() {
    this.error.set(null);
    this.loading.set(true);

    this.auth.login({ email: this.email.trim(), password: this.password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.guestLikes.flush().subscribe((matched) => {
          if (matched.length) this.toast.show(`It's a match with ${matched.join(', ')}!`);
        });
        this.router.navigate(['/app/discover']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'Login failed. Check your connection and try again.');
      },
    });
  }
}
