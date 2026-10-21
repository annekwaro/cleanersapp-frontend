export type Role = 'HOMEOWNER' | 'CLEANER';

export interface User {
  email: string;
  name: string;
  role: Role;
}

export interface Profile {
  id: number;
  email?: string | null;
  name: string;
  role: Role;
  bio: string | null;
  hourlyRate: number | null;
  rating: number | null;
  profilePicture: string | null;
  headline: string | null;
  services: string[];
  languages: string[];
  availableDays: string[];
  serviceArea: string | null;
  yearsExperience: number | null;
  bringsSupplies: boolean | null;
  petFriendly: boolean | null;
  acceptsDirectRequests: boolean;
  completedJobs: number;
}

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'email' | 'role' | 'rating' | 'completedJobs'>>;

/** Homeowner asking a cleaner for a slot straight from their profile. */
export interface DirectRequestDraft {
  cleanerId: number;
  startAt: string; // local wall time, "YYYY-MM-DDTHH:mm:00"
  durationHours: number;
  address?: string;
  notes?: string;
  message?: string;
}

export interface DirectRequestResult {
  matchId: number;
  booking: Booking;
}

export interface SwipeResult {
  matched: boolean;
  matchId?: number;
  message: string;
}

export interface Match {
  matchId: number;
  otherUserId: number;
  otherUserName: string;
  otherUserRole: Role;
  otherUserProfilePicture: string | null;
  matchedAt: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageMine: boolean;
}

export interface Message {
  id: number;
  matchId: number;
  senderId: number;
  senderName: string;
  content: string;
  sentAt: string;
  isMine: boolean;
}

export type BookingStatus = 'REQUESTED' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED' | 'COMPLETED';

export interface Booking {
  id: number;
  matchId: number;
  otherUserId: number;
  otherUserName: string;
  otherUserProfilePicture: string | null;
  startAt: string;
  endAt: string;
  durationHours: number;
  hourlyRate: number;
  totalAmount: number;
  address: string | null;
  notes: string | null;
  status: BookingStatus;
  cancelReason: string | null;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
  requestedByMe: boolean;
  cancelledByMe: boolean;
  canRespond: boolean;
  canCancel: boolean;
  canComplete: boolean;
  canRate: boolean;
}

export interface BookingDraft {
  matchId: number;
  startAt: string; // local wall time, "YYYY-MM-DDTHH:mm:00"
  durationHours: number;
  address?: string;
  notes?: string;
}

export const SERVICES = [
  'Regular clean',
  'Deep clean',
  'Move in / out',
  'End of tenancy',
  'Kitchen',
  'Bathrooms',
  'Laundry & ironing',
  'Windows',
  'Oven',
  'Fridge',
  'After a party',
  'Office',
];

export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
