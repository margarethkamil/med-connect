import { create } from 'zustand';
import { Doctor } from '../types/doctor';
import { 
  getDoctors, 
  getDoctorAvailability,
  updateDoctor,
  createDoctor,
  deleteDoctor
} from '../api/client';
import { isAfter, isBefore, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';

// Import the error tracking function
import { trackError } from '../services/analytics';

// Availability filter options
export type AvailabilityFilter = 'any' | 'today' | 'this-week' | 'next-available';

interface DoctorState {
  doctors: Doctor[];
  filteredDoctors: Doctor[];
  selectedSpecialties: string[];
  selectedAvailability: AvailabilityFilter;
  loading: boolean;
  error: string | null;
  doctorsWithAvailability: Record<string, string[]>; // Map of doctorId -> available datetimes
  fetchDoctors: () => Promise<void>;
  fetchDoctorAvailabilities: (doctorIds: string[]) => Promise<void>;
  filterBySpecialty: (specialties: string[]) => void;
  filterByAvailability: (availability: AvailabilityFilter) => void;
  getSpecialties: () => string[];
  resetFilters: () => void;
  // Added for direct availability management
  setDoctorAvailability: (doctorId: string, slots: string[]) => void;
  // Added for admin doctor management
  updateDoctorDetails: (doctorId: string, data: Partial<Doctor>) => Promise<Doctor>;
  createNewDoctor: (data: Partial<Doctor>) => Promise<Doctor>;
  deleteExistingDoctor: (doctorId: string) => Promise<void>;
}

const defaultState: Omit<DoctorState, 'fetchDoctors' | 'fetchDoctorAvailabilities' | 'filterBySpecialty' | 'filterByAvailability' | 'getSpecialties' | 'resetFilters' | 'setDoctorAvailability' | 'updateDoctorDetails' | 'createNewDoctor' | 'deleteExistingDoctor'> = {
  doctors: [],
  filteredDoctors: [],
  selectedSpecialties: [],
  selectedAvailability: 'any',
  loading: false,
  error: null,
  doctorsWithAvailability: {},
};

export const useDoctorStore = create<DoctorState>((set, get) => {
  // Helper function to apply all filters that has access to the set function
  const applyFilters = () => {
    const state = get();
    const { 
      doctors, 
      selectedSpecialties, 
      selectedAvailability, 
      doctorsWithAvailability 
    } = state;
    
    // Start with all doctors
    let filtered = [...doctors];
    
    // Apply specialty filter if selected
    if (selectedSpecialties.length > 0) {
      filtered = filtered.filter(doctor => 
        doctor?.specialty && selectedSpecialties.includes(doctor.specialty)
      );
    }
    
    // Apply availability filter
    if (selectedAvailability !== 'any' && Object.keys(doctorsWithAvailability).length > 0) {
      const now = new Date();
      const today = startOfDay(now);
      const endToday = endOfDay(now);
      const startThisWeek = startOfWeek(now);
      const endThisWeek = endOfWeek(now);
      
      filtered = filtered.filter(doctor => {
        const availabilities = doctorsWithAvailability[doctor.id] || [];
        
        if (availabilities.length === 0) return false;
        
        // Sort availabilities by date (ascending)
        const sortedAvailabilities = [...availabilities].sort();
        
        switch (selectedAvailability) {
          case 'today':
            // At least one slot today
            return sortedAvailabilities.some(slot => {
              const dateTime = new Date(slot);
              return isAfter(dateTime, today) && isBefore(dateTime, endToday);
            });
            
          case 'this-week':
            // At least one slot this week
            return sortedAvailabilities.some(slot => {
              const dateTime = new Date(slot);
              return isAfter(dateTime, startThisWeek) && isBefore(dateTime, endThisWeek);
            });
            
          case 'next-available':
            // Has any future availability
            return sortedAvailabilities.some(slot => {
              const dateTime = new Date(slot);
              return isAfter(dateTime, now);
            });
            
          default:
            return true;
        }
      });
    }
    
    // Update the filtered doctors state using the set function
    set({ filteredDoctors: filtered });
    return filtered;
  };

  return {
    ...defaultState,

    fetchDoctors: async () => {
      const { loading } = get();
      // Only fetch if we're not already loading
      if (loading) return;
      
      set({ loading: true, error: null });
      try {
        // Get doctors with their availability data included
        const doctors = await getDoctors(true);
        const allDoctors = doctors || [];
        
        // Process availability data included with doctors
        const availabilityMap: Record<string, string[]> = {};
        allDoctors.forEach(doctor => {
          if (doctor.id && doctor.availability) {
            availabilityMap[doctor.id] = doctor.availability;
          }
        });
        
        set({ 
          doctors: allDoctors,
          filteredDoctors: allDoctors,
          loading: false,
          // Set availability data from the doctor objects
          doctorsWithAvailability: availabilityMap
        });
        
        // Only fetch individual availability for doctors that don't have it included
        const doctorsWithoutAvailability = allDoctors
          .filter(doctor => !doctor.availability)
          .map(doctor => doctor.id);
        
        if (doctorsWithoutAvailability.length > 0) {
          get().fetchDoctorAvailabilities(doctorsWithoutAvailability);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch doctors';
        // Track the error
        trackError('DoctorStore', errorMessage, error);
        set({ 
          error: errorMessage,
          loading: false
        });
      }
    },
    
    fetchDoctorAvailabilities: async (doctorIds: string[]) => {
      if (!doctorIds.length) return;
      
      try {
        const availabilitiesMap: Record<string, string[]> = {};
        
        // Fetch availability for each doctor
        await Promise.all(doctorIds.map(async (doctorId) => {
          try {
            console.log(`Fetching availability for doctor ${doctorId}`);
            const availability = await getDoctorAvailability(doctorId);
            console.log(`Received availability for doctor ${doctorId}:`, availability);
            
            // The API already returns an array of ISO datetime strings
            // No need for processing, just use the array directly
            availabilitiesMap[doctorId] = availability;
            
            console.log(`Processed availability for doctor ${doctorId}:`, availability);
          } catch (err) {
            console.error(`Error fetching availability for doctor ${doctorId}:`, err);
            availabilitiesMap[doctorId] = [];
          }
        }));
        
        set({ doctorsWithAvailability: availabilitiesMap });
        
        // Re-apply filters with new availability data
        applyFilters();
      } catch (error) {
        console.error('Error fetching availabilities:', error);
      }
    },

    filterBySpecialty: (specialties: string[]) => {
      set({ selectedSpecialties: specialties });
      applyFilters();
    },
    
    filterByAvailability: (availability: AvailabilityFilter) => {
      set({ selectedAvailability: availability });
      applyFilters();
    },
    
    getSpecialties: () => {
      const { doctors } = get();
      if (!doctors || !doctors.length) return [];
      
      const specialtiesSet = new Set(
        doctors
          .filter(doctor => doctor?.specialty)
          .map(doctor => doctor.specialty)
      );
      
      return Array.from(specialtiesSet).sort();
    },
    
    resetFilters: () => {
      set({ 
        selectedSpecialties: [],
        selectedAvailability: 'any'
      });
      
      // Re-apply filters (effectively resetting to show all doctors)
      applyFilters();
    },
    
    // Method to directly set availability data for a specific doctor
    setDoctorAvailability: (doctorId: string, slots: string[]) => {
      const currentAvailabilities = { ...get().doctorsWithAvailability };
      currentAvailabilities[doctorId] = slots;
      
      console.log(`Setting availability for doctor ${doctorId}:`, slots);
      set({ doctorsWithAvailability: currentAvailabilities });
      
      // Re-apply filters with the new availability data
      applyFilters();
    },
    
    // Methods for admin doctor management
    updateDoctorDetails: async (doctorId: string, data: Partial<Doctor>) => {
      set({ loading: true, error: null });
      
      try {
        const updatedDoctor = await updateDoctor(doctorId, data);
        
        // Update the doctor in the local state
        set(state => {
          const updatedDoctors = state.doctors.map(doctor => 
            doctor.id === doctorId ? updatedDoctor : doctor
          );
          
          return {
            doctors: updatedDoctors,
            filteredDoctors: applyFilters(),
            loading: false
          };
        });
        
        return updatedDoctor;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update doctor';
        // Track the error
        trackError('DoctorStore', errorMessage, { doctorId, data, error });
        set({ 
          error: errorMessage,
          loading: false
        });
        throw error;
      }
    },
    
    createNewDoctor: async (data: Partial<Doctor>) => {
      set({ loading: true, error: null });
      
      try {
        const newDoctor = await createDoctor(data as any);
        
        // Add the new doctor to the local state
        set(state => {
          const updatedDoctors = [...state.doctors, newDoctor];
          
          return {
            doctors: updatedDoctors,
            filteredDoctors: applyFilters(),
            loading: false
          };
        });
        
        return newDoctor;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create doctor';
        // Track the error
        trackError('DoctorStore', errorMessage, { data, error });
        set({ 
          error: errorMessage,
          loading: false
        });
        throw error;
      }
    },
    
    deleteExistingDoctor: async (doctorId: string) => {
      set({ loading: true, error: null });
      
      try {
        await deleteDoctor(doctorId);
        
        // Remove the doctor from the local state
        set(state => {
          const updatedDoctors = state.doctors.filter(doctor => doctor.id !== doctorId);
          
          return {
            doctors: updatedDoctors,
            filteredDoctors: updatedDoctors,
            loading: false
          };
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete doctor';
        // Track the error
        trackError('DoctorStore', errorMessage, { doctorId, error });
        set({ 
          error: errorMessage,
          loading: false
        });
        throw error;
      }
    }
  };
}); 