import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { ToastService } from '../core/services/toast.service';
import { DAYS, Profile } from '../core/models';
import { DAY_NAMES, initials, money } from '../core/format';
import { swatchFor } from './avatar.component';
import { IconComponent } from './icon.component';

/** Full profile: big photo, a white panel of facts, then one clear action. */
@Component({
  selector: 'app-profile-sheet',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scrim" (click)="closed.emit()">
      <div class="sheet !bg-white !p-0" role="dialog" aria-modal="true" [attr.aria-label]="p().name" (click)="$event.stopPropagation()">
        <!-- Photo -->
        <div class="relative h-[21rem] overflow-hidden rounded-t-[1.75rem] sm:rounded-t-[1.75rem]" [style.background]="fallbackBg()">
          <span class="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 font-display text-[6.5rem] font-extrabold leading-none text-white/90">{{ letters() }}</span>
          @if (p().profilePicture && !broken()) {
            <img [src]="p().profilePicture" [alt]="p().name" class="absolute inset-0 h-full w-full object-cover" (error)="broken.set(true)" />
          }
          <div class="absolute inset-x-0 top-0 flex justify-between p-4">
            <button type="button" (click)="closed.emit()" aria-label="Close"
              class="grid h-11 w-11 place-items-center rounded-full bg-white text-coal-900 shadow">
              <app-icon name="back" [size]="18" />
            </button>
            <div class="flex gap-2">
              @if (shareable()) {
                <button type="button" (click)="share()" [attr.aria-label]="'Share ' + firstName()"
                  class="grid h-11 w-11 place-items-center rounded-full bg-white text-coal-900 shadow">
                  <app-icon name="share" [size]="18" />
                </button>
              }
              @if (actions()) {
                <button type="button" (click)="liked.emit()" [attr.aria-label]="(likedAlready() ? 'Liked ' : 'Like ') + firstName()" [attr.aria-pressed]="likedAlready()"
                  class="grid h-11 w-11 place-items-center rounded-full bg-white shadow" [class]="likedAlready() ? 'text-brand-600' : 'text-coal-900'">
                  <app-icon name="heart" [size]="20" [filled]="likedAlready()" />
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Details panel overlaps the photo -->
        <div class="relative -mt-7 space-y-6 rounded-t-[1.75rem] bg-white px-5 pb-6 pt-6 sm:px-6">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-[1.7rem] font-extrabold leading-tight tracking-tight">{{ p().name }}</h2>
              @if (canRequest()) { <span class="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-700">Taking bookings</span> }
            </div>
            @if (p().headline) { <p class="mt-1 text-muted">{{ p().headline }}</p> }
            @if (p().serviceArea) {
              <p class="mt-1.5 flex items-center gap-1.5 text-sm text-muted"><app-icon name="pin" [size]="15" />{{ p().serviceArea }}</p>
            }
          </div>

          <div class="grid grid-cols-3 gap-2.5">
            <div class="rounded-2xl border border-line p-3">
              <app-icon name="star" [size]="18" [filled]="true" class="text-butter-500" />
              <p class="mt-1.5 font-bold">{{ p().rating ? p().rating!.toFixed(1) : 'New' }}</p>
              <p class="text-xs text-muted">Rating</p>
            </div>
            @if (isCleaner()) {
              <div class="rounded-2xl border border-line p-3">
                <app-icon name="check" [size]="18" class="text-brand-600" />
                <p class="mt-1.5 font-bold">{{ p().completedJobs }}</p>
                <p class="text-xs text-muted">Jobs done</p>
              </div>
              <div class="rounded-2xl border border-line p-3">
                <app-icon name="wallet" [size]="18" class="text-brand-600" />
                <p class="mt-1.5 font-bold">{{ rate() }}</p>
                <p class="text-xs text-muted">Per hour</p>
              </div>
            } @else {
              <div class="col-span-2 rounded-2xl border border-line p-3">
                <app-icon name="home" [size]="18" class="text-brand-600" />
                <p class="mt-1.5 truncate font-bold">{{ p().serviceArea || '—' }}</p>
                <p class="text-xs text-muted">Neighbourhood</p>
              </div>
            }
          </div>

          @if (traits().length) {
            <section class="flex flex-wrap gap-2" aria-label="Good to know">
              @for (t of traits(); track t.text) {
                <span class="inline-flex items-center gap-2 rounded-full border border-line py-1.5 pl-1.5 pr-3.5 text-sm font-semibold text-coal-800">
                  <span class="grid h-7 w-7 place-items-center rounded-full" [class]="t.tone"><app-icon [name]="t.icon" [size]="15" /></span>
                  {{ t.text }}
                </span>
              }
            </section>
          }

          @if (p().bio) {
            <section>
              <h3 class="mb-1.5 font-bold">About {{ firstName() }}</h3>
              <p class="whitespace-pre-line text-[0.95rem] leading-relaxed text-coal-800">{{ p().bio }}</p>
            </section>
          }

          @if (p().services.length) {
            <section>
              <h3 class="mb-2 font-bold">{{ isCleaner() ? 'Services' : 'Looking for' }}</h3>
              <div class="flex flex-wrap gap-2">
                @for (s of p().services; track s) { <span class="chip !border-line !bg-white">{{ s }}</span> }
              </div>
            </section>
          }

          @if (p().availableDays.length) {
            <section>
              <h3 class="mb-2 font-bold">{{ isCleaner() ? 'Usually available' : 'Preferred days' }}</h3>
              <div class="flex gap-1.5">
                @for (d of days; track d) {
                  <span class="grid h-10 flex-1 place-items-center rounded-xl text-xs font-bold"
                    [class]="p().availableDays.includes(d) ? 'bg-brand-600 text-white' : 'bg-cream-100 text-muted/60'">
                    {{ dayNames[d] }}
                  </span>
                }
              </div>
            </section>
          }

        </div>

        @if (actions()) {
          <div class="sticky bottom-0 border-t border-line bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
            <div class="flex gap-2.5">
              @if (passable()) {
                <button type="button" class="btn btn-ghost !px-4" (click)="passed.emit()" aria-label="Pass">
                  <app-icon name="x" [size]="20" />
                </button>
              }
              @if (isCleaner()) {
                <button type="button" class="btn btn-ghost !px-4" (click)="message.emit()" [attr.aria-label]="'Message ' + firstName()">
                  <app-icon name="chat" [size]="20" />
                </button>
              }
              @if (canRequest()) {
                <button type="button" class="btn btn-primary flex-1 !py-3.5" (click)="request.emit()">
                  <app-icon name="calendar-plus" [size]="18" /> Book {{ firstName() }}
                </button>
              } @else {
                <button type="button" class="btn btn-primary flex-1 !py-3.5" (click)="liked.emit()" [disabled]="likedAlready()">
                  <app-icon name="heart" [size]="18" [filled]="true" /> {{ likedAlready() ? 'Liked' : 'Like ' + firstName() }}
                </button>
              }
            </div>
            @if (canRequest()) {
              <p class="mt-2 text-center text-xs text-muted">No payment now — {{ firstName() }} confirms the time first.</p>
            }
          </div>
        }
      </div>
    </div>`,
})
export class ProfileSheetComponent {
  private toast = inject(ToastService);
  p = input.required<Profile>({ alias: 'profile' });
  actions = input(true);
  /** Show "Book <name>" (homeowners and guests viewing a cleaner who takes direct requests). */
  requestable = input(false);
  /** Offer "Pass" (swipe mode); in a list there's nothing to pass on. */
  passable = input(true);
  likedAlready = input(false);
  closed = output<void>();
  liked = output<void>();
  passed = output<void>();
  request = output<void>();
  message = output<void>();
  /** Show the share button (public cleaner profiles only). */
  shareable = input(false);

  days = DAYS;
  dayNames = DAY_NAMES;
  isCleaner = computed(() => this.p().role === 'CLEANER');
  canRequest = computed(() => this.requestable() && this.isCleaner() && this.p().acceptsDirectRequests);
  rate = computed(() => (this.p().hourlyRate ? money(this.p().hourlyRate) : '—'));
  broken = signal(false);
  letters = computed(() => initials(this.p().name));
  fallbackBg = computed(() => {
    const c = swatchFor(this.p().id || this.p().name);
    return `linear-gradient(160deg, color-mix(in srgb, ${c} 75%, white) 0%, ${c} 100%)`;
  });
  firstName = computed(() => this.p().name.split(' ')[0]);
  /** Quick facts as icon chips, Friendly / Playful style. */
  traits = computed(() => {
    const p = this.p();
    const list: { icon: string; text: string; tone: string }[] = [];
    if (p.yearsExperience) list.push({ icon: 'briefcase', text: `${p.yearsExperience} yrs experience`, tone: 'bg-brand-100 text-brand-700' });
    if (p.bringsSupplies !== null) list.push({ icon: 'box', text: this.suppliesText(), tone: 'bg-butter-300/60 text-coal-900' });
    if (p.petFriendly) list.push({ icon: 'paw', text: this.isCleaner() ? 'Pet friendly' : 'Has pets', tone: 'bg-clay-100 text-clay-500' });
    if (p.languages.length) list.push({ icon: 'globe', text: p.languages.join(', '), tone: 'bg-cream-200 text-coal-800' });
    return list;
  });

  async share() {
    const p = this.p();
    const url = `${location.origin}/?cleaner=${p.id}`;
    const text = `${p.name} on CleanMatch${p.headline ? ' — ' + p.headline : ''}`;
    try {
      if (navigator.share) await navigator.share({ title: p.name, text, url });
      else {
        await navigator.clipboard.writeText(url);
        this.toast.show('Link copied');
      }
    } catch {
      // share sheet dismissed
    }
  }

  suppliesText = computed(() => {
    const yes = this.p().bringsSupplies;
    if (this.isCleaner()) return yes ? 'Brings own products & kit' : 'Uses your products';
    return yes ? 'Cleaner should bring supplies' : 'Supplies available at home';
  });
}
