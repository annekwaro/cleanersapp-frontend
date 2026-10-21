import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Booking, Match, Message, Profile } from '../../core/models';
import { dayLabel, sameDay, toDate } from '../../core/format';
import { AvatarComponent } from '../../shared/avatar.component';
import { IconComponent } from '../../shared/icon.component';
import { BookingCardComponent } from '../../shared/booking-card.component';
import { BookingSheetComponent } from '../../shared/booking-sheet.component';
import { ProfileSheetComponent } from '../../shared/profile-sheet.component';

interface DayGroup {
  label: string;
  messages: Message[];
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    AvatarComponent,
    IconComponent,
    BookingCardComponent,
    BookingSheetComponent,
    ProfileSheetComponent,
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  auth = inject(AuthService);
  private toast = inject(ToastService);

  @ViewChild('scroller') scroller?: ElementRef<HTMLElement>;

  matchId = signal(0);
  match = signal<Match | null>(null);
  other = signal<Profile | null>(null);
  myRate = signal<number | null>(null);
  messages = signal<Message[]>([]);
  bookings = signal<Booking[]>([]);
  loading = signal(true);
  sending = signal(false);
  error = signal<string | null>(null);
  showBooking = signal(false);
  showProfile = signal(false);
  showAllBookings = signal(false);
  newMessage = '';

  private pollMessages: any = null;
  private pollBookings: any = null;

  otherName = computed(() => this.match()?.otherUserName ?? this.other()?.name ?? 'Chat');
  firstName = computed(() => this.otherName().split(' ')[0]);
  rate = computed(() => (this.auth.isCleaner() ? this.myRate() : this.other()?.hourlyRate ?? null));

  activeBookings = computed(() =>
    this.bookings().filter((b) => b.status === 'REQUESTED' || b.status === 'CONFIRMED' || b.canRate)
  );

  groups = computed<DayGroup[]>(() => {
    const out: DayGroup[] = [];
    let last: Date | null = null;
    for (const m of this.messages()) {
      const d = toDate(m.sentAt);
      if (!last || !sameDay(last, d)) {
        out.push({ label: dayLabel(d), messages: [] });
        last = d;
      }
      out[out.length - 1].messages.push(m);
    }
    return out;
  });

  quickReplies = computed(() =>
    this.auth.isCleaner()
      ? ['Hi! What kind of clean are you looking for?', 'How many rooms and bathrooms?', 'Do you have supplies, or should I bring mine?']
      : ['Hi! Are you free next week?', 'Do you bring your own supplies?', 'How long would a 2-bedroom take?']
  );

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('matchId'));
    this.matchId.set(id);

    this.api.getMatches().subscribe({
      next: (list) => {
        const m = list.find((x) => x.matchId === id) ?? null;
        this.match.set(m);
        if (m) this.api.getProfile(m.otherUserId).subscribe({ next: (p) => this.other.set(p), error: () => {} });
      },
      error: () => {},
    });
    if (this.auth.isCleaner()) {
      this.api.getMyProfile().subscribe({ next: (p) => this.myRate.set(p.hourlyRate), error: () => {} });
    }

    this.loadMessages();
    this.loadBookings();
    this.pollMessages = setInterval(() => this.loadMessages(true), 3000);
    this.pollBookings = setInterval(() => this.loadBookings(), 15000);
  }

  ngOnDestroy() {
    clearInterval(this.pollMessages);
    clearInterval(this.pollBookings);
  }

  loadMessages(silent = false) {
    if (!silent) this.loading.set(true);
    this.api.getMessages(this.matchId()).subscribe({
      next: (data) => {
        const grew = data.length !== this.messages().length;
        this.messages.set(data);
        this.loading.set(false);
        this.error.set(null);
        if (grew) this.scrollToBottom();
      },
      error: (err) => {
        this.loading.set(false);
        if (!silent) this.error.set(err?.error?.error || 'Failed to load messages');
      },
    });
  }

  loadBookings() {
    this.api.getMatchBookings(this.matchId()).subscribe({
      next: (list) => this.bookings.set(list),
      error: () => {}, // older backend without bookings: chat still works
    });
  }

  onBookingChanged(b: Booking) {
    this.bookings.update((list) => list.map((x) => (x.id === b.id ? b : x)));
  }

  onBookingCreated(b: Booking) {
    this.showBooking.set(false);
    this.bookings.update((list) => [...list, b]);
  }

  send(text?: string) {
    const content = (text ?? this.newMessage).trim();
    if (!content || this.sending()) return;

    this.sending.set(true);
    this.api.sendMessage(this.matchId(), content).subscribe({
      next: (msg) => {
        this.newMessage = '';
        this.sending.set(false);
        this.messages.update((list) => [...list, { ...msg, isMine: true }]);
        this.scrollToBottom();
      },
      error: (err) => {
        this.sending.set(false);
        this.toast.error(err, 'Message not sent');
      },
    });
  }

  onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      const el = this.scroller?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }
}
