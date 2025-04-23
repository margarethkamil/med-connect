import { Doctor } from '../types/doctor';
import { Appointment, BookingRequest } from '../types/appointment';

const API_BASE_URL = 'https://us-central1-doctor-booking-backend-5c6aa.cloudfunctions.net/api';

// Doctor endpoints
const DOCTORS_URL = `${API_BASE_URL}/doctors`;
const DOCTOR_DETAILS_URL = (id: string) => `${API_BASE_URL}/doctors/${id}`;
const DOCTOR_AVAILABILITY_URL = (id: string) => `${API_BASE_URL}/doctors/${id}/availability`;

// Appointment endpoints
const APPOINTMENTS_URL = `${API_BASE_URL}/appointments`;
const USER_APPOINTMENTS_URL = (userId: string) => `${API_BASE_URL}/appointments/user/${userId}`;
const CHECK_SLOT_AVAILABLE_URL = (doctorId: string, dateTime: string) => 
  `${API_BASE_URL}/appointments/available/${doctorId}/${dateTime}`;

// Add a new endpoint constant for admin appointments
const ADMIN_APPOINTMENTS_URL = `${API_BASE_URL}/appointments/admin`;

// Get all doctors
export const getDoctors = async (includeAvailability: boolean = true): Promise<Doctor[]> => {
  // Add query parameter to include availability data directly in the response
  const url = includeAvailability ? `${DOCTORS_URL}?include_availability=true` : DOCTORS_URL;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch doctors');
  const doctors = await response.json();
  
  // Log data received for debugging
  //console.log(`Received ${doctors.length} doctors with availability data:`, 
    //includeAvailability ? 'included' : 'not included');
  
  return doctors;
};

// Get doctor details
export const getDoctorDetails = async (id: string): Promise<Doctor> => {
  const response = await fetch(DOCTOR_DETAILS_URL(id));
  if (!response.ok) throw new Error('Failed to fetch doctor details');
  return response.json();
};

// Get doctor availability
export const getDoctorAvailability = async (id: string): Promise<string[]> => {
  const response = await fetch(DOCTOR_AVAILABILITY_URL(id));
  if (!response.ok) throw new Error('Failed to fetch doctor availability');
  return response.json();
};

// Book an appointment
export const bookAppointment = async (bookingData: BookingRequest): Promise<Appointment> => {
  const response = await fetch(APPOINTMENTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bookingData),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to book appointment');
  }
  
  return response.json();
};

// Get user appointments
export const getUserAppointments = async (userId: string): Promise<Appointment[]> => {
  //console.log(`Fetching appointments for user: ${userId}`);
  
  if (!userId) {
    //console.error('getUserAppointments: userId is empty');
    return [];
  }
  
  try {
    const url = USER_APPOINTMENTS_URL(userId);
    //console.log(`GET request to: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error fetching appointments: ${response.status} ${errorText}`);
      throw new Error(`Failed to fetch user appointments: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    //console.log(`Received ${data.length} appointments:`, data);
    return data;
  } catch (error) {
    //console.error('Error in getUserAppointments:', error);
    throw error;
  }
};

// Check if slot is available before booking
export const checkSlotAvailable = async (doctorId: string, dateTime: string): Promise<boolean> => {
  try {
    // Build the full URL with proper formatting
    // Need to ensure dateTime is in the format expected by the API (YYYY-MM-DDTHH:MM)
    // The function expects a properly formatted dateTime string
    const url = CHECK_SLOT_AVAILABLE_URL(doctorId, dateTime);
    //console.log(`Checking slot availability: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error checking availability: ${response.status} ${errorText}`);
      throw new Error(`Failed to check slot availability: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    //console.log(`Slot availability result:`, result);
    
    // The API returns { isAvailable: true/false }
    return result.isAvailable === true;
  } catch (error) {
    //console.error('Error checking slot availability:', error);
    // In case of error, assume the slot is not available to prevent double booking
    return false;
  }
};

// Cancel appointment
export const cancelAppointment = async (appointmentId: string): Promise<Appointment> => {
  if (!appointmentId) {
    throw new Error('appointmentId is required');
  }
  
  //console.log(`Cancelling appointment: ${appointmentId}`);
  
  try {
    const url = `${APPOINTMENTS_URL}/${appointmentId}`;
    //console.log(`DELETE request to: ${url}`);
    
    // According to the test script, we use DELETE method to cancel
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error cancelling appointment: ${response.status} ${errorText}`);
      throw new Error(`Failed to cancel appointment: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    //console.log('Appointment cancelled successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in cancelAppointment:', error);
    throw error;
  }
};

// Update appointment status
export const updateAppointmentStatus = async (appointmentId: string, status: string): Promise<Appointment> => {
  if (!appointmentId) {
    throw new Error('appointmentId is required');
  }
  
  //console.log(`Updating appointment ${appointmentId} status to: ${status}`);
  
  try {
    const url = `${APPOINTMENTS_URL}/${appointmentId}`;
    //console.log(`PUT request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error updating appointment: ${response.status} ${errorText}`);
      throw new Error(`Failed to update appointment: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    //console.log('Appointment updated successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in updateAppointmentStatus:', error);
    throw error;
  }
};

// Get all appointments (admin only)
export const getAllAppointments = async (options: { 
  limit?: number;
  lastDoc?: string; 
  status?: string;
} = {}): Promise<{
  appointments: Appointment[];
  hasMore: boolean;
  lastDoc: string | null;
}> => {
  //console.log(`Fetching all appointments with options:`, options);
  
  try {
    // Build query string
    const queryParams = new URLSearchParams();
    if (options.limit) queryParams.append('limit', options.limit.toString());
    if (options.lastDoc) queryParams.append('lastDoc', options.lastDoc);
    if (options.status) queryParams.append('status', options.status);
    
    const queryString = queryParams.toString();
    const url = `${ADMIN_APPOINTMENTS_URL}${queryString ? `?${queryString}` : ''}`;
    
    //console.log(`GET request to: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error fetching admin appointments: ${response.status} ${errorText}`);
      throw new Error(`Failed to fetch admin appointments: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    //console.log(`Received ${data.appointments.length} admin appointments:`, data);
    return data;
  } catch (error) {
    console.error('Error in getAllAppointments:', error);
    throw error;
  }
};

// Update a complete appointment (admin function)
export const updateCompleteAppointment = async (
  appointmentId: string, 
  data: {
    patientName?: string;
    patientEmail?: string;
    status?: string;
    doctorId?: string;
  }
): Promise<Appointment> => {
  if (!appointmentId) {
    throw new Error('appointmentId is required');
  }
  
  // Validate data values - ensure status is never empty and is one of the valid values
  const validatedData = { ...data };
  if (!validatedData.status || validatedData.status === '') {
    validatedData.status = 'pending';
  }
  
  if (!['pending', 'confirmed', 'cancelled'].includes(validatedData.status)) {
    validatedData.status = 'pending';
  }
  
  //console.log(`Updating appointment ${appointmentId} with validated data:`, validatedData);
  
  try {
    const url = `${APPOINTMENTS_URL}/${appointmentId}`;
    //console.log(`PUT request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validatedData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error updating appointment: ${response.status} ${errorText}`);
      throw new Error(`Failed to update appointment: ${response.status} ${errorText}`);
    }
    
    const updatedAppointment = await response.json();
    //console.log('Appointment updated successfully:', updatedAppointment);
    return updatedAppointment;
  } catch (error) {
    console.error('Error in updateCompleteAppointment:', error);
    throw error;
  }
};

// Update a doctor (admin function)
export const updateDoctor = async (
  doctorId: string, 
  data: {
    name?: string;
    specialty?: string;
    location?: string;
    bio?: string;
    photoUrl?: string;
    email?: string;
    phone?: string;
    fee?: number | string;
  }
): Promise<Doctor> => {
  if (!doctorId) {
    throw new Error('doctorId is required');
  }
  
  // Convert fee to number if it's a string
  const processedData = { ...data };
  if (typeof processedData.fee === 'string' && processedData.fee !== '') {
    processedData.fee = parseFloat(processedData.fee);
  }
  
  //console.log(`Updating doctor ${doctorId} with data:`, processedData);
  
  try {
    const url = DOCTOR_DETAILS_URL(doctorId);
    //console.log(`PUT request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(processedData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error updating doctor: ${response.status} ${errorText}`);
      throw new Error(`Failed to update doctor: ${response.status} ${errorText}`);
    }
    
    const updatedDoctor = await response.json();
    //console.log('Doctor updated successfully:', updatedDoctor);
    return updatedDoctor;
  } catch (error) {
    console.error('Error in updateDoctor:', error);
    throw error;
  }
};

// Create a new doctor (admin function)
export const createDoctor = async (
  data: {
    name: string;
    specialty: string;
    location?: string;
    bio?: string;
    photoUrl?: string;
    email?: string;
    phone?: string;
    fee?: number | string;
  }
): Promise<Doctor> => {
  // Convert fee to number if it's a string
  const processedData = { ...data };
  if (typeof processedData.fee === 'string' && processedData.fee !== '') {
    processedData.fee = parseFloat(processedData.fee);
  }
  
  //console.log(`Creating new doctor with data:`, processedData);
  
  try {
    const url = DOCTORS_URL;
    //console.log(`POST request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(processedData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error creating doctor: ${response.status} ${errorText}`);
      throw new Error(`Failed to create doctor: ${response.status} ${errorText}`);
    }
    
    const newDoctor = await response.json();
    //console.log('Doctor created successfully:', newDoctor);
    return newDoctor;
  } catch (error) {
    console.error('Error in createDoctor:', error);
    throw error;
  }
};

// Delete a doctor (admin function)
export const deleteDoctor = async (doctorId: string): Promise<void> => {
  if (!doctorId) {
    throw new Error('doctorId is required');
  }
  
  //console.log(`Deleting doctor: ${doctorId}`);
  
  try {
    const url = DOCTOR_DETAILS_URL(doctorId);
    //console.log(`DELETE request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error deleting doctor: ${response.status} ${errorText}`);
      throw new Error(`Failed to delete doctor: ${response.status} ${errorText}`);
    }
    
    //console.log('Doctor deleted successfully');
  } catch (error) {
    console.error('Error in deleteDoctor:', error);
    throw error;
  }
}; 