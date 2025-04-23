export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  photo?: string;
  photoUrl?: string; // Alternative photo URL field
  bio?: string;
  rating?: number;
  reviewCount?: number;
  education?: string[];
  experience?: string[];
  location?: string;
  availability?: string[]; // ISO datetime strings for available days
  email?: string;
  phone?: string;
  fee?: number;
}

export interface Availability {
  date: string;
  slots: string[];
} 