import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  email = '';
  password = '';
  name = '';
  role: 'HOMEOWNER' | 'CLEANER' = 'HOMEOWNER';
  bio = '';
  hourlyRate: number | null = null;
  error = signal<string | null>(null);
  loading = signal(false);

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    this.error.set(null);
    this.loading.set(true);

    const payload: any = {
      email: this.email,
      password: this.password,
      name: this.name,
      role: this.role,
      bio: this.bio,
    };

    if (this.role === 'CLEANER') {
      payload.hourlyRate = this.hourlyRate;
    }

    this.auth.register(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/swipe']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'Registration failed');
      },
    });
  }
}
