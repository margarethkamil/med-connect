export interface Appointment {
  id: string;
  doctorId: string;
  patientId?: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  date: string;
  time: string;
  reason?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  dateTime?: string;
  doctorName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BookingRequest {
  doctorId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  date: string;
  time: string;
  dateTime: string;
  reason?: string;
  userId: string;
  status?: 'confirmed' | 'pending' | 'cancelled';
} 