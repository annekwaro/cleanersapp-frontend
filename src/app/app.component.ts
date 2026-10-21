import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastService } from './core/services/toast.service';
import { PublicCleanersService } from './core/services/public-cleaners.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet />
    @if (toast.message(); as message) {
      <div class="toast" role="status" aria-live="polite">{{ message }}</div>
    }
  `,
})
export class AppComponent {
  toast = inject(ToastService);

  constructor() {
    // Start waking the free Render backend before any page needs it
    inject(PublicCleanersService).warmUp();
  }
}
