import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { DAYS, Profile, SERVICES } from '../../core/models';
import { DAY_NAMES } from '../../core/format';
import { profileChecks, profileStrength } from '../../core/profile-strength';
import { IconComponent } from '../../shared/icon.component';
import { ProfileCardComponent } from '../../shared/profile-card.component';
import { ProfileSheetComponent } from '../../shared/profile-sheet.component';

const BIO_MAX = 255; // matches the backend column

const HEADLINES = {
  CLEANER: [
    'Deep-clean specialist, 6 years in family homes',
    'Reliable weekly cleaner — same day, same time, every time',
    'Move-out cleans that get your deposit back',
    'Eco products, pet lover, detail-obsessed',
  ],
  HOMEOWNER: [
    '2-bed flat, weekly clean, one friendly cat',
    'Family house, need a fortnightly deep clean',
    'Moving out end of month — need an end-of-tenancy clean',
    'Small studio, quick tidy every Friday',
  ],
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, IconComponent, ProfileCardComponent, ProfileSheetComponent],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  welcome = signal(false);
  showPreview = signal(false);
  showCoach = signal(true);

  // Editable copy; a signal so the preview and strength meter update live
  draft = signal<Profile | null>(null);
  languagesText = '';

  allServices = SERVICES;
  days = DAYS;
  dayNames = DAY_NAMES;
  bioMax = BIO_MAX;

  isCleaner = computed(() => this.draft()?.role === 'CLEANER');
  strength = computed(() => (this.draft() ? profileStrength(this.draft()!) : 0));
  todo = computed(() => (this.draft() ? profileChecks(this.draft()!).filter((c) => !c.done) : []));
  headlines = computed(() => HEADLINES[this.isCleaner() ? 'CLEANER' : 'HOMEOWNER']);
  bioLength = computed(() => (this.draft()?.bio || '').length);

  /** Things in the bio that tend to hurt matches or safety. */
  bioWarnings = computed(() => {
    const bio = this.draft()?.bio || '';
    const out: string[] = [];
    if (/\S+@\S+\.\S+/.test(bio) || /(\+?\d[\d\s().-]{7,}\d)/.test(bio)) {
      out.push('Keep phone numbers and emails out of your bio — share them in chat once you match.');
    }
    if (/[A-Z]{6,}/.test(bio)) out.push('Avoid ALL CAPS — it reads as shouting.');
    if (/\b(no|don't|do not|won't|never)\b/i.test(bio) && this.isCleaner()) {
      out.push('Lead with what you do, not what you don\'t. Save limits for the chat.');
    }
    return out;
  });

  ngOnInit() {
    this.welcome.set(this.route.snapshot.queryParamMap.has('welcome'));
    this.api.getMyProfile().subscribe({
      next: (p) => {
        this.draft.set({ ...p, bringsSupplies: p.bringsSupplies ?? false, petFriendly: p.petFriendly ?? false });
        this.languagesText = p.languages.join(', ');
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'Could not load your profile');
      },
    });
  }

  set<K extends keyof Profile>(key: K, value: Profile[K]) {
    this.draft.update((d) => (d ? { ...d, [key]: value } : d));
  }

  toggleIn(key: 'services' | 'availableDays', value: string) {
    const list = this.draft()![key];
    this.set(key, list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  onLanguages(text: string) {
    this.languagesText = text;
    this.set('languages', text.split(',').map((s) => s.trim()).filter(Boolean));
  }

  /** Fills the bio from the structured fields so nobody starts from a blank box. */
  useTemplate() {
    const d = this.draft()!;
    const first = d.name.split(' ')[0];
    const services = d.services.slice(0, 2).map((s) => s.toLowerCase()).join(' and ');
    let bio: string;
    if (this.isCleaner()) {
      bio =
        `Hi, I'm ${first}! ` +
        (d.yearsExperience ? `I've been cleaning homes for ${d.yearsExperience} years` : `I clean homes`) +
        (d.serviceArea ? ` around ${d.serviceArea}` : '') +
        '. ' +
        (services ? `I specialise in ${services}. ` : '') +
        (d.bringsSupplies ? 'I bring my own products. ' : '') +
        (d.petFriendly ? 'Pets welcome! ' : '') +
        'Reliable, discreet and always on time.';
    } else {
      bio =
        `Hi, I'm ${first}. ` +
        (d.serviceArea ? `We live in ${d.serviceArea}` : 'We live in a') +
        (d.serviceArea ? '' : ' cosy home') +
        '. ' +
        (services ? `Looking for help with ${services}. ` : 'Looking for a regular cleaner. ') +
        (d.petFriendly ? 'We have a friendly pet. ' : '') +
        'Easy access, flexible on times.';
    }
    this.set('bio', bio.slice(0, BIO_MAX));
  }

  save() {
    const d = this.draft();
    if (!d) return;
    if ((d.bio || '').length > BIO_MAX) {
      this.toast.show(`Bio must be ${BIO_MAX} characters or fewer`);
      return;
    }
    this.saving.set(true);
    this.api
      .updateProfile({
        name: d.name,
        bio: d.bio ?? '',
        profilePicture: d.profilePicture ?? '',
        headline: d.headline ?? '',
        services: d.services,
        languages: d.languages,
        availableDays: d.availableDays,
        serviceArea: d.serviceArea ?? '',
        yearsExperience: d.yearsExperience ?? undefined,
        bringsSupplies: d.bringsSupplies ?? false,
        petFriendly: d.petFriendly ?? false,
        ...(this.isCleaner() ? { acceptsDirectRequests: d.acceptsDirectRequests } : {}),
        ...(this.isCleaner() && d.hourlyRate ? { hourlyRate: d.hourlyRate } : {}),
      })
      .subscribe({
        next: (p) => {
          this.saving.set(false);
          this.draft.set({ ...p, bringsSupplies: p.bringsSupplies ?? false, petFriendly: p.petFriendly ?? false });
          this.auth.currentUser.update((u) => (u ? { ...u, name: p.name } : u));
          try {
            localStorage.setItem('cleanersapp_user', JSON.stringify(this.auth.currentUser()));
          } catch {}
          this.welcome.set(false);
          this.toast.show('Profile saved');
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(err, 'Could not save profile');
        },
      });
  }
}
