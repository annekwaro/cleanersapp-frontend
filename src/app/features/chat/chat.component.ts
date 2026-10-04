import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

interface Message {
  id: number;
  matchId: number;
  senderId: number;
  senderName: string;
  content: string;
  sentAt: string;
  isMine: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent implements OnInit, OnDestroy {
  matchId = signal<number>(0);
  messages = signal<Message[]>([]);
  newMessage = '';
  loading = signal(true);
  sending = signal(false);
  error = signal<string | null>(null);
  otherUserName = signal<string>('');

  private pollInterval: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    public auth: AuthService
  ) {}

  ngOnInit() {
    // Get matchId from URL
    const id = Number(this.route.snapshot.paramMap.get('matchId'));
    this.matchId.set(id);

    this.loadMessages();

    // Poll for new messages every 3 seconds
    this.pollInterval = setInterval(() => {
      this.loadMessages(true); // silent refresh
    }, 3000);
  }

  ngOnDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  loadMessages(silent = false) {
    if (!silent) this.loading.set(true);

    this.api.getMessages(this.matchId()).subscribe({
      next: (data: Message[]) => {
        this.messages.set(data);
        this.loading.set(false);
        this.scrollToBottom();

        // Find the other user's name
        const other = data.find((m) => !m.isMine);
        if (other) {
          this.otherUserName.set(other.senderName);
        }
      },
      error: (err) => {
        this.loading.set(false);
        if (!silent) {
          this.error.set(err?.error?.error || 'Failed to load messages');
        }
      },
    });
  }

  send() {
    const content = this.newMessage.trim();
    if (!content || this.sending()) return;

    this.sending.set(true);

    this.api.sendMessage(this.matchId(), content).subscribe({
      next: () => {
        this.newMessage = '';
        this.sending.set(false);
        this.loadMessages(true); // refresh to get the new message
      },
      error: (err) => {
        this.sending.set(false);
        this.error.set(err?.error?.error || 'Failed to send message');
      },
    });
  }

  goBack() {
    this.router.navigate(['/matches']);
  }

  private scrollToBottom() {
    setTimeout(() => {
      const container = document.getElementById('messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
}
