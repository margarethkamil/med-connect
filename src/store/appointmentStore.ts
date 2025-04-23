import { create } from 'zustand';
import { Appointment, BookingRequest } from '../types/appointment';
import { 
  getUserAppointments, 
  bookAppointment, 
  cancelAppointment,
  updateAppointmentStatus,
  getAllAppointments,
  updateCompleteAppointment
} from '../api/client';

interface AppointmentState {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  fetchUserAppointments: (userId: string) => Promise<void>;
  fetchAllAppointments: (options?: { status?: string }) => Promise<void>;
  bookNewAppointment: (
    appointmentData: BookingRequest
  ) => Promise<Appointment>;
  cancelUserAppointment: (appointmentId: string) => Promise<void>;
  updateAppointmentStatus: (appointmentId: string, status: string) => Promise<void>;
  updateAppointmentDetails: (
    appointmentId: string, 
    data: {
      patientName?: string;
      patientEmail?: string;
      status?: string;
      doctorId?: string;
    }
  ) => Promise<Appointment>;
}

// For demo purposes, we'll use a hardcoded userId
const DEMO_USER_ID = 'user123';

const defaultState: Omit<AppointmentState, 'fetchUserAppointments' | 'fetchAllAppointments' | 'bookNewAppointment' | 'cancelUserAppointment' | 'updateAppointmentStatus' | 'updateAppointmentDetails'> = {
  appointments: [],
  loading: false,
  error: null,
};

export const useAppointmentStore = create<AppointmentState>((set, get) => ({
  ...defaultState,

  fetchUserAppointments: async (userId: string) => {
    if (!userId) return;
    
    // Don't fetch if already loading
    const { loading } = get();
    if (loading) return;
    
    set({ loading: true, error: null });
    try {
      const appointments = await getUserAppointments(userId);
      set({ appointments: appointments || [], loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch appointments',
        loading: false
      });
    }
  },

  fetchAllAppointments: async (options = {}) => {
    // Don't fetch if already loading
    const { loading } = get();
    if (loading) return;
    
    set({ loading: true, error: null });
    try {
      // Use the new admin API endpoint with options
      const result = await getAllAppointments(options);
      set({ appointments: result.appointments || [], loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch all appointments',
        loading: false
      });
    }
  },

  bookNewAppointment: async (appointmentData) => {
    if (!appointmentData?.doctorId || !appointmentData?.patientName || !appointmentData?.patientEmail) {
      throw new Error('Invalid appointment data');
    }

    // Don't book if already loading
    const { loading } = get();
    if (loading) throw new Error('Operation in progress');

    set({ loading: true, error: null });
    try {
      const newAppointment = await bookAppointment(appointmentData);
      
      // Update local state
      set(state => ({
        appointments: [...(state?.appointments || []), newAppointment],
        loading: false
      }));
      
      return newAppointment;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to book appointment',
        loading: false
      });
      throw error;
    }
  },

  cancelUserAppointment: async (appointmentId: string) => {
    if (!appointmentId) return;
    
    // Don't cancel if already loading
    const { loading } = get();
    if (loading) return;
    
    set({ loading: true, error: null });
    try {
      const cancelledAppointment = await cancelAppointment(appointmentId);
      
      // Update local state
      set(state => ({
        appointments: (state?.appointments || []).map(appointment => 
          appointment.id === appointmentId 
            ? cancelledAppointment 
            : appointment
        ),
        loading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to cancel appointment',
        loading: false
      });
      throw error;
    }
  },

  updateAppointmentStatus: async (appointmentId: string, status: string) => {
    if (!appointmentId) return;
    
    // Don't update if already loading
    const { loading } = get();
    if (loading) return;
    
    set({ loading: true, error: null });
    try {
      const updatedAppointment = await updateAppointmentStatus(appointmentId, status);
      
      // Update the appointment in our local state
      set(state => ({
        appointments: (state?.appointments || []).map(appointment => 
          appointment.id === appointmentId 
            ? updatedAppointment 
            : appointment
        ),
        loading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : `Failed to update appointment status to ${status}`,
        loading: false
      });
      throw error;
    }
  },

  updateAppointmentDetails: async (
    appointmentId: string, 
    data: {
      patientName?: string;
      patientEmail?: string;
      status?: string;
      doctorId?: string;
    }
  ) => {
    if (!appointmentId) return Promise.reject(new Error('Appointment ID is required'));
    
    // Don't update if already loading
    const { loading } = get();
    if (loading) return Promise.reject(new Error('Operation in progress'));
    
    set({ loading: true, error: null });
    try {
      const updatedAppointment = await updateCompleteAppointment(appointmentId, data);
      
      // Update the appointment in our local state
      set(state => ({
        appointments: (state?.appointments || []).map(appointment => 
          appointment.id === appointmentId 
            ? updatedAppointment 
            : appointment
        ),
        loading: false
      }));
      
      return updatedAppointment;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update appointment',
        loading: false
      });
      throw error;
    }
  }
}));

// Export the demo user ID for easy access
export { DEMO_USER_ID }; 