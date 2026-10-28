import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PostAuthService } from '../../../core/services/post-auth.service';
import { CardFanComponent } from '../../../shared/card-fan.component';
import { LogoComponent } from '../../../shared/logo.component';
import { IconComponent } from '../../../shared/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, LogoComponent, IconComponent, CardFanComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private postAuth = inject(PostAuthService);

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
        this.postAuth.continue(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'Login failed. Check your connection and try again.');
      },
    });
  }
}
