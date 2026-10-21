import { Injectable, signal } from '@angular/core';

export interface AuthPrompt {
  heading: string;
  subheading: string;
  cta: string;
  icon: string;
}

/** Opens the inline sign-up sheet (rendered once, by the shell) from anywhere. */
@Injectable({ providedIn: 'root' })
export class AuthPromptService {
  prompt = signal<AuthPrompt | null>(null);

  open(prompt: Partial<AuthPrompt> = {}) {
    this.prompt.set({
      heading: 'Create your free account',
      subheading: 'Save cleaners you like, request times and chat — all in one place.',
      cta: 'Create account',
      icon: 'sparkles',
      ...prompt,
    });
  }

  close() {
    this.prompt.set(null);
  }
}
