import { Profile } from './models';

export interface StrengthCheck {
  label: string;
  done: boolean;
  weight: number;
}

/** What makes a profile get matched, weighted by how much it matters on the card. */
export function profileChecks(p: Profile): StrengthCheck[] {
  const cleaner = p.role === 'CLEANER';
  const bio = (p.bio || '').trim().length;
  return cleaner
    ? [
        { label: 'Add a clear, friendly photo', done: !!p.profilePicture, weight: 20 },
        { label: 'Write a one-line headline', done: !!p.headline?.trim(), weight: 10 },
        { label: 'Write a bio of 120+ characters', done: bio >= 120, weight: 20 },
        { label: 'Pick the services you offer', done: p.services.length > 0, weight: 15 },
        { label: 'Say where you work', done: !!p.serviceArea?.trim(), weight: 10 },
        { label: 'Mark the days you are available', done: p.availableDays.length > 0, weight: 10 },
        { label: 'Add your years of experience', done: !!p.yearsExperience, weight: 5 },
        { label: 'List the languages you speak', done: p.languages.length > 0, weight: 5 },
        { label: 'Set your hourly rate', done: !!p.hourlyRate, weight: 5 },
      ]
    : [
        { label: 'Add a photo (you or your home)', done: !!p.profilePicture, weight: 15 },
        { label: 'Describe your home in one line', done: !!p.headline?.trim(), weight: 20 },
        { label: 'Say what you need help with', done: p.services.length > 0, weight: 20 },
        { label: 'Add your neighbourhood', done: !!p.serviceArea?.trim(), weight: 20 },
        { label: 'Write a short bio', done: bio >= 60, weight: 15 },
        { label: 'Pick preferred days', done: p.availableDays.length > 0, weight: 10 },
      ];
}

export function profileStrength(p: Profile): number {
  return profileChecks(p).reduce((sum, c) => sum + (c.done ? c.weight : 0), 0);
}
