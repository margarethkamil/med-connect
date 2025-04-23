import React, { useEffect, useState, useCallback } from 'react';
import { useAppointmentStore } from '../store/appointmentStore';
import { useDoctorStore } from '../store/doctorStore';
import { Appointment } from '../types/appointment';
import { Doctor } from '../types/doctor';
import { format } from 'date-fns';
import { useSeo } from '../services/useSeo';
import { seoConfigs } from '../services/seo';
import { Link } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';

// Patient interface for the API
interface PatientData {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  dateOfBirth?: string;
}

// Patient interface derived from appointments
interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  appointmentsCount: number;
  lastAppointment: string;
  status: string;  // Primary status for display (most recent)
  hasConfirmed: boolean;  // Has at least one confirmed appointment
  hasPending: boolean;    // Has at least one pending appointment
  hasCancelled: boolean;  // Has at least one cancelled appointment
  patientData?: PatientData; // Full patient data from API
}

const API_BASE_URL = 'https://us-central1-doctor-booking-backend-5c6aa.cloudfunctions.net/api';

const AdminPatients: React.FC = () => {
  // Apply SEO metadata
  useSeo(seoConfigs.admin.patients());

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for patient editing
  const [editingPatient, setEditingPatient] = useState<PatientData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  
  // State for mobile menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get appointments and doctors from store
  const appointments = useAppointmentStore(state => state.appointments);
  const loading = useAppointmentStore(state => state.loading);
  const error = useAppointmentStore(state => state.error);
  const fetchAllAppointments = useAppointmentStore(state => state.fetchAllAppointments);
  
  const doctors = useDoctorStore(state => state.doctors);
  const fetchDoctors = useDoctorStore(state => state.fetchDoctors);

  // Fetch patient data from API
  const fetchPatientById = async (patientId: string): Promise<PatientData | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/patients/${patientId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Patient not found
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get patient');
      }
      
      return await response.json();
    } catch (error) {
      //console.error('Error fetching patient:', error);
      return null;
    }
  };

  // Update patient in API
  const updatePatient = async (patientId: string, updates: Partial<PatientData>): Promise<PatientData | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/patients/${patientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update patient');
      }
      
      return await response.json();
    } catch (error) {
      //console.error('Error updating patient:', error);
      throw error;
    }
  };

  // Create a patient in API
  const createPatient = async (patientData: Omit<PatientData, 'id'>): Promise<PatientData | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(patientData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create patient');
      }
      
      return await response.json();
    } catch (error) {
      //console.error('Error creating patient:', error);
      throw error;
    }
  };

  // Handle opening the edit modal
  const handleEditPatient = async (patientId: string) => {
    try {
      // Find patient in local state first
      const localPatient = patients.find(p => p.id === patientId);
      if (!localPatient) {
        //console.error('Patient not found in local state');
        return;
      }
      
      // First try to get complete patient data by userId (email)
      //console.log('Trying to fetch patient by userId:', localPatient.email);
      let patientData = null;
      
      try {
        // Primary lookup method - by userId
        const response = await fetch(`${API_BASE_URL}/patients/user/${localPatient.email}`);
        //console.log('userId lookup response status:', response.status);
        
        if (response.ok) {
          patientData = await response.json();
          //console.log('Found patient by userId:', patientData);
        } else {
          // If specific test patient, try the known ID
          if (localPatient.email.toLowerCase() === 'testing1@mail.com') {
            //console.log('Using known API ID for testing1@mail.com');
            const knownPatientResponse = await fetch(`${API_BASE_URL}/patients/5isdoj2aCmVCzmB9greZ`);
            if (knownPatientResponse.ok) {
              patientData = await knownPatientResponse.json();
              //console.log('Retrieved patient with known ID:', patientData);
            }
          }
        }
      } catch (error) {
        //console.error('Error looking up patient by userId:', error);
      }
      
      // If patient not found by userId, try to create
      if (!patientData) {
        try {
          // Try to create the patient
          patientData = await createPatient({
            name: localPatient.name,
            email: localPatient.email,
            phone: localPatient.phone || '',
            userId: localPatient.email // Use patient's email as userId
          });
          
          //console.log('Created new patient in API:', patientData);
        } catch (createError: any) {
          //console.error('Error creating patient in API:', createError);
          
          // If error suggests userId already exists, try to fetch again by userId
          if (createError.message && createError.message.includes('already exists')) {
            //console.log('Detected existing userId, retrying fetch by userId');
            try {
              const retryResponse = await fetch(`${API_BASE_URL}/patients/user/${localPatient.email}`);
              if (retryResponse.ok) {
                patientData = await retryResponse.json();
                //console.log('Retrieved existing patient by userId after creation error:', patientData);
              }
            } catch (retryError) {
              //console.error('Error on retry lookup:', retryError);
            }
          }
          
          // If still no data, try the fallback approach with all patients
          if (!patientData) {
            try {
              //console.log('Attempting to get all patients as fallback');
              const allPatientsResponse = await fetch(`${API_BASE_URL}/patients`);
              if (allPatientsResponse.ok) {
                const allPatientsData = await allPatientsResponse.json();
                
                // Try to find the patient by email
                const foundPatient = allPatientsData.patients.find(
                  (p: any) => p.email.toLowerCase() === localPatient.email.toLowerCase()
                );
                
                if (foundPatient) {
                  //console.log('Found patient in full list:', foundPatient);
                  patientData = foundPatient;
                }
              }
            } catch (allPatientsError) {
              //console.error('Error fetching all patients:', allPatientsError);
            }
          }
        }
      }
      
      // If still no data, fall back to local
      if (!patientData) {
        //console.log('All API attempts failed, falling back to local data');
        patientData = {
          id: localPatient.id,
          name: localPatient.name,
          email: localPatient.email,
          phone: localPatient.phone || ''
        };
      }
      
      if (patientData) {
        setEditingPatient(patientData);
        setIsEditModalOpen(true);
      } else {
        //console.error('No patient data available');
      }
    } catch (error) {
      //console.error('Error preparing patient for edit:', error);
    }
  };

  // Handle saving patient edits
  const handleSavePatient = async () => {
    if (!editingPatient) return;
    
    setIsSaving(true);
    setEditError(null);
    
    try {
      const updatedPatient = await updatePatient(editingPatient.id, {
        name: editingPatient.name,
        email: editingPatient.email,
        phone: editingPatient.phone,
        address: editingPatient.address,
        dateOfBirth: editingPatient.dateOfBirth
      });
      
      if (updatedPatient) {
        // Update patient in local state
        setPatients(prevPatients => 
          prevPatients.map(p => 
            p.id === updatedPatient.id 
              ? { 
                  ...p, 
                  name: updatedPatient.name, 
                  email: updatedPatient.email, 
                  phone: updatedPatient.phone,
                  patientData: updatedPatient 
                } 
              : p
          )
        );
        
        setIsEditModalOpen(false);
        setEditingPatient(null);
      }
    } catch (error: any) {
      setEditError(error.message || 'Failed to save patient');
    } finally {
      setIsSaving(false);
    }
  };

  // Load all appointments and doctors
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (fetchAllAppointments) {
        await fetchAllAppointments();
      }
      if (doctors.length === 0) {
        await fetchDoctors();
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchAllAppointments, fetchDoctors, doctors.length]);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Process appointments into patient list
  useEffect(() => {
    if (appointments.length > 0) {
      const patientMap = new Map<string, Patient>();
      
      // First, collect all appointments by patient
      const patientAppointments = new Map<string, Appointment[]>();
      
      appointments.forEach(appointment => {
        const patientId = appointment.patientEmail.toLowerCase(); // Use email as unique identifier
        if (!patientAppointments.has(patientId)) {
          patientAppointments.set(patientId, [appointment]);
        } else {
          patientAppointments.get(patientId)?.push(appointment);
        }
      });
      
      // Then process each patient with all their appointments
      patientAppointments.forEach((patientAppts, patientId) => {
        // Sort by date, newest first
        patientAppts.sort((a, b) => {
          const dateA = new Date(a.dateTime || `${a.date}T${a.time}`);
          const dateB = new Date(b.dateTime || `${b.date}T${b.time}`);
          return dateB.getTime() - dateA.getTime();
        });
        
        // Get the most recent appointment
        const mostRecentAppointment = patientAppts[0];
        
        // Count appointments by status and check if patient has any of each status
        const hasConfirmed = patientAppts.some(a => a.status === 'confirmed');
        const hasPending = patientAppts.some(a => a.status === 'pending');
        const hasCancelled = patientAppts.some(a => a.status === 'cancelled');
        
        patientMap.set(patientId, {
          id: patientId,
          name: mostRecentAppointment.patientName,
          email: mostRecentAppointment.patientEmail,
          phone: mostRecentAppointment.patientPhone || 'N/A',
          appointmentsCount: patientAppts.length,
          lastAppointment: mostRecentAppointment.dateTime || `${mostRecentAppointment.date}T${mostRecentAppointment.time}`,
          status: mostRecentAppointment.status, // Keep for display
          hasConfirmed,
          hasPending,
          hasCancelled
        });
      });
      
      setPatients(Array.from(patientMap.values()));
    }
  }, [appointments]);

  // Get doctor's name by ID
  const getDoctorNameById = (doctorId: string): string => {
    const doctor = doctors.find(d => d.id === doctorId);
    return doctor ? doctor.name : 'Unknown Doctor';
  };

  // Filter patients by search term and status
  const filteredPatients = patients.filter(patient => {
    const matchesSearch = 
      searchTerm === '' || 
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Check if patient has ANY appointment with the selected status
    const matchesStatus = 
      statusFilter === null || 
      (statusFilter === 'confirmed' && patient.hasConfirmed) ||
      (statusFilter === 'pending' && patient.hasPending) ||
      (statusFilter === 'cancelled' && patient.hasCancelled);
    
    return matchesSearch && matchesStatus;
  });

  // Get patient's appointments
  const getPatientAppointments = (patientEmail: string): Appointment[] => {
    // First filter by patient email
    let patientAppointments = appointments.filter(appointment => 
      appointment.patientEmail.toLowerCase() === patientEmail.toLowerCase()
    );
    
    // If there's a status filter, only show appointments with that status
    if (statusFilter) {
      patientAppointments = patientAppointments.filter(appointment => 
        appointment.status === statusFilter
      );
    }
    
    // Sort by date, newest first
    return patientAppointments.sort((a, b) => {
      const dateA = new Date(a.dateTime || `${a.date}T${a.time}`);
      const dateB = new Date(b.dateTime || `${b.date}T${b.time}`);
      return dateB.getTime() - dateA.getTime();
    });
  };

  // Format appointment date
  const formatAppointmentDate = (appointment: Appointment): string => {
    const dateTime = appointment.dateTime || `${appointment.date}T${appointment.time}`;
    return format(new Date(dateTime), 'MMM d, yyyy - h:mm a');
  };

  // Get status badge classes
  const getStatusBadgeClass = (status: string): string => {
    switch(status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <AdminNavbar />

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
        <h1 className="text-2xl font-bold text-gray-900 text-center sm:text-left">Patient Management</h1>
        <button
          onClick={loadData}
          disabled={isLoading}
          className={`px-4 py-2 rounded ${isLoading ? 'bg-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Patients
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2"
                placeholder="Search by name, email or phone"
              />
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status Filter
            </label>
            <select
              id="status"
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter(e.target.value || null)}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2"
            >
              <option value="">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
          <p>Error: {error}</p>
        </div>
      )}

      {/* Patients List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Appointments
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Appointment
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPatients.map((patient) => (
                <React.Fragment key={patient.id}>
                  <tr 
                    className={`hover:bg-gray-50 cursor-pointer ${selectedPatient === patient.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedPatient(selectedPatient === patient.id ? null : patient.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">{patient.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="ml-4 flex items-center">
                          <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                          <button 
                            className="ml-2 text-gray-400 hover:text-blue-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPatient(patient.id);
                            }}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{patient.email}</div>
                      <div className="text-sm text-gray-500">{patient.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {patient.appointmentsCount}
                      {statusFilter && (
                        <span className="ml-2 text-xs">
                          ({getPatientAppointments(patient.id).length} {statusFilter})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(patient.lastAppointment), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPatient(selectedPatient === patient.id ? null : patient.id);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {selectedPatient === patient.id ? 'Hide Details' : 'View Details'}
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded view with patient appointments */}
                  {selectedPatient === patient.id && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 bg-gray-50">
                        <div className="border-t border-gray-200 pt-4">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Appointment History
                            {statusFilter && (
                              <span className="ml-2 text-sm font-normal text-gray-500">
                                (Filtered by {statusFilter} status)
                              </span>
                            )}
                          </h3>
                          
                          {getPatientAppointments(patient.id).length === 0 ? (
                            <p className="text-sm text-gray-500">
                              {statusFilter 
                                ? `No ${statusFilter} appointments found.` 
                                : 'No appointments found.'}
                            </p>
                          ) : (
                            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                              <ul className="divide-y divide-gray-200">
                                {getPatientAppointments(patient.id).map((appointment) => (
                                  <li key={appointment.id} className="px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-blue-600 truncate">
                                          Dr. {getDoctorNameById(appointment.doctorId)}
                                        </p>
                                        <p className="mt-1 flex items-center text-sm text-gray-500">
                                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                          </svg>
                                          {formatAppointmentDate(appointment)}
                                        </p>
                                        {appointment.reason && (
                                          <p className="mt-1 text-sm text-gray-500">
                                            Reason: {appointment.reason}
                                          </p>
                                        )}
                                      </div>
                                      <div>
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(appointment.status)}`}>
                                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                                        </span>
                                      </div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              
              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                    {isLoading ? (
                      <div className="flex justify-center">
                        <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    ) : (
                      'No patients found. Adjust your filters or refresh the data.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden">
          {filteredPatients.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-500">
              {isLoading ? (
                <div className="flex justify-center">
                  <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                'No patients found. Adjust your filters or refresh the data.'
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredPatients.map((patient) => (
                <li key={patient.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">{patient.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                        </div>
                      </div>
                      <button 
                        className="text-gray-400 hover:text-blue-500"
                        onClick={() => handleEditPatient(patient.id)}
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-1 gap-1 text-sm">
                      <div>
                        <span className="text-gray-500">Email: </span>
                        <span className="font-medium text-gray-900">{patient.email}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Phone: </span>
                        <span className="font-medium text-gray-900">{patient.phone}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Appointments: </span>
                        <span className="font-medium text-gray-900">
                          {patient.appointmentsCount}
                          {statusFilter && (
                            <span className="ml-2 text-xs">
                              ({getPatientAppointments(patient.id).length} {statusFilter})
                            </span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Visit: </span>
                        <span className="font-medium text-gray-900">
                          {format(new Date(patient.lastAppointment), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex justify-between items-center">
                      <button
                        onClick={() => setSelectedPatient(selectedPatient === patient.id ? null : patient.id)}
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                      >
                        {selectedPatient === patient.id ? 'Hide Details' : 'View Details'}
                      </button>
                    </div>

                    {/* Mobile expanded view */}
                    {selectedPatient === patient.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h3 className="text-base font-medium text-gray-900 mb-2">
                          Appointment History
                          {statusFilter && (
                            <span className="ml-2 text-sm font-normal text-gray-500">
                              (Filtered by {statusFilter} status)
                            </span>
                          )}
                        </h3>

                        {getPatientAppointments(patient.id).length === 0 ? (
                          <p className="text-sm text-gray-500">
                            {statusFilter 
                              ? `No ${statusFilter} appointments found.` 
                              : 'No appointments found.'}
                          </p>
                        ) : (
                          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
                            {getPatientAppointments(patient.id).map((appointment) => (
                              <li key={appointment.id} className="px-4 py-3">
                                <div>
                                  <div className="flex justify-between mb-1">
                                    <p className="text-sm font-medium text-blue-600">
                                      Dr. {getDoctorNameById(appointment.doctorId)}
                                    </p>
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(appointment.status)}`}>
                                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-500 flex items-center">
                                    <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {formatAppointmentDate(appointment)}
                                  </p>
                                  {appointment.reason && (
                                    <p className="mt-1 text-sm text-gray-500">
                                      Reason: {appointment.reason}
                                    </p>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Basic Stats */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-100 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-blue-700">Total Patients</div>
              <div className="text-3xl font-semibold text-blue-800">{patients.length}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-green-100 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-200 flex items-center justify-center">
              <svg className="h-6 w-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-green-700">Confirmed Appointments</div>
              <div className="text-3xl font-semibold text-green-800">
                {appointments.filter(a => a.status === 'confirmed').length}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-100 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-yellow-200 flex items-center justify-center">
              <svg className="h-6 w-6 text-yellow-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-yellow-700">Pending Appointments</div>
              <div className="text-3xl font-semibold text-yellow-800">
                {appointments.filter(a => a.status === 'pending').length}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-red-100 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-200 flex items-center justify-center">
              <svg className="h-6 w-6 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-red-700">Cancelled Appointments</div>
              <div className="text-3xl font-semibold text-red-800">
                {appointments.filter(a => a.status === 'cancelled').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Patient Modal */}
      {isEditModalOpen && editingPatient && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
            {/* Background overlay with blur */}
            <div className="fixed inset-0 backdrop-blur-md bg-black/30 transition-opacity" aria-hidden="true"></div>
            
            {/* Modal content - higher z-index to ensure it's above overlay */}
            <div 
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full p-4 sm:p-6 relative z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Edit Patient
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingPatient(null);
                    setEditError(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {editError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm mb-4">
                  {editError}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    value={editingPatient.name}
                    onChange={(e) => setEditingPatient({...editingPatient, name: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    value={editingPatient.email}
                    onChange={(e) => setEditingPatient({...editingPatient, email: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    value={editingPatient.phone}
                    onChange={(e) => setEditingPatient({...editingPatient, phone: e.target.value})}
                  />
                </div>
                
                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    value={editingPatient.dateOfBirth || ''}
                    onChange={(e) => setEditingPatient({...editingPatient, dateOfBirth: e.target.value})}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    value={editingPatient.address || ''}
                    onChange={(e) => setEditingPatient({...editingPatient, address: e.target.value})}
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  className="w-full sm:w-auto py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingPatient(null);
                    setEditError(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`w-full sm:w-auto py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isSaving ? 'opacity-75 cursor-not-allowed' : ''}`}
                  onClick={handleSavePatient}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPatients; 