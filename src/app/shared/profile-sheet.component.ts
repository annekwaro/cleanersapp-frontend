import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DAYS, Profile } from '../core/models';
import { DAY_NAMES, money } from '../core/format';
import { IconComponent } from './icon.component';
import { ProfileCardComponent } from './profile-card.component';

/** Full profile, Riter "detail" style: big photo, facts, then one clear action. */
@Component({
  selector: 'app-profile-sheet',
  standalone: true,
  imports: [IconComponent, ProfileCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scrim" (click)="closed.emit()">
      <div class="sheet !p-0" role="dialog" aria-modal="true" [attr.aria-label]="p().name" (click)="$event.stopPropagation()">
        <div class="relative h-[22rem] p-3 pb-0">
          <app-profile-card [profile]="p()" />
          <button type="button" (click)="closed.emit()" aria-label="Close"
            class="absolute left-6 top-6 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-forest-900 shadow">
            <app-icon name="back" [size]="18" />
          </button>
        </div>

        <div class="space-y-6 px-5 pb-6 pt-5 sm:px-6">
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="rounded-2xl bg-white p-3">
              <p class="font-display text-xl font-semibold">{{ p().rating ? p().rating!.toFixed(1) : '—' }}</p>
              <p class="text-xs text-muted">Rating</p>
            </div>
            @if (isCleaner()) {
              <div class="rounded-2xl bg-white p-3">
                <p class="font-display text-xl font-semibold">{{ p().completedJobs }}</p>
                <p class="text-xs text-muted">Jobs done</p>
              </div>
              <div class="rounded-2xl bg-white p-3">
                <p class="font-display text-xl font-semibold">{{ rate() }}</p>
                <p class="text-xs text-muted">Per hour</p>
              </div>
            } @else {
              <div class="col-span-2 rounded-2xl bg-white p-3">
                <p class="font-display text-xl font-semibold truncate">{{ p().serviceArea || '—' }}</p>
                <p class="text-xs text-muted">Neighbourhood</p>
              </div>
            }
          </div>

          @if (p().bio) {
            <section>
              <p class="eyebrow mb-2">About</p>
              <p class="whitespace-pre-line leading-relaxed text-forest-900/90">{{ p().bio }}</p>
            </section>
          }

          @if (p().services.length) {
            <section>
              <p class="eyebrow mb-2">{{ isCleaner() ? 'Services' : 'Looking for' }}</p>
              <div class="flex flex-wrap gap-2">
                @for (s of p().services; track s) { <span class="chip !bg-sage-100">{{ s }}</span> }
              </div>
            </section>
          }

          @if (p().availableDays.length) {
            <section>
              <p class="eyebrow mb-2">{{ isCleaner() ? 'Usually available' : 'Preferred days' }}</p>
              <div class="flex gap-1.5">
                @for (d of days; track d) {
                  <span class="grid h-10 flex-1 place-items-center rounded-xl text-xs font-bold"
                    [class]="p().availableDays.includes(d) ? 'bg-forest-900 text-cream-50' : 'bg-white text-muted/60'">
                    {{ dayNames[d] }}
                  </span>
                }
              </div>
            </section>
          }

          <section class="divide-y divide-line rounded-2xl bg-white">
            @if (p().serviceArea) {
              <div class="flex items-center gap-3 p-4">
                <span class="grid h-9 w-9 place-items-center rounded-full bg-sage-100 text-sage-700"><app-icon name="pin" [size]="18" /></span>
                <div><p class="eyebrow">{{ isCleaner() ? 'Works in' : 'Location' }}</p><p class="font-semibold">{{ p().serviceArea }}</p></div>
              </div>
            }
            @if (p().yearsExperience) {
              <div class="flex items-center gap-3 p-4">
                <span class="grid h-9 w-9 place-items-center rounded-full bg-sage-100 text-sage-700"><app-icon name="briefcase" [size]="18" /></span>
                <div><p class="eyebrow">Experience</p><p class="font-semibold">{{ p().yearsExperience }} years</p></div>
              </div>
            }
            @if (p().bringsSupplies !== null) {
              <div class="flex items-center gap-3 p-4">
                <span class="grid h-9 w-9 place-items-center rounded-full bg-sage-100 text-sage-700"><app-icon name="box" [size]="18" /></span>
                <div><p class="eyebrow">Supplies</p><p class="font-semibold">{{ suppliesText() }}</p></div>
              </div>
            }
            @if (p().languages.length) {
              <div class="flex items-center gap-3 p-4">
                <span class="grid h-9 w-9 place-items-center rounded-full bg-sage-100 text-sage-700"><app-icon name="globe" [size]="18" /></span>
                <div><p class="eyebrow">Speaks</p><p class="font-semibold">{{ p().languages.join(', ') }}</p></div>
              </div>
            }
          </section>
        </div>

        @if (actions()) {
          <div class="sticky bottom-0 flex gap-3 border-t border-line bg-cream-50/95 px-5 py-4 backdrop-blur sm:px-6">
            <button type="button" class="btn btn-ghost flex-1" (click)="passed.emit()">
              <app-icon name="x" [size]="18" /> Pass
            </button>
            <button type="button" class="btn btn-primary flex-[2]" (click)="liked.emit()">
              <app-icon name="heart" [size]="18" [filled]="true" /> Like {{ firstName() }}
            </button>
          </div>
        }
      </div>
    </div>`,
})
export class ProfileSheetComponent {
  p = input.required<Profile>({ alias: 'profile' });
  actions = input(true);
  closed = output<void>();
  liked = output<void>();
  passed = output<void>();

  days = DAYS;
  dayNames = DAY_NAMES;
  isCleaner = computed(() => this.p().role === 'CLEANER');
  rate = computed(() => (this.p().hourlyRate ? money(this.p().hourlyRate) : '—'));
  firstName = computed(() => this.p().name.split(' ')[0]);
  suppliesText = computed(() => {
    const yes = this.p().bringsSupplies;
    if (this.isCleaner()) return yes ? 'Brings own products & kit' : 'Uses your products';
    return yes ? 'Cleaner should bring supplies' : 'Supplies available at home';
  });
}
