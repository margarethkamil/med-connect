import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { useAppointmentStore } from '../store/appointmentStore';
import { useDoctorStore } from '../store/doctorStore';
import { Appointment } from '../types/appointment';
import { Doctor } from '../types/doctor';
import { format, getDate, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useNavigate } from 'react-router-dom';
import { trackCrudEvents } from '../services/analytics';

// Panama time zone
const TIME_ZONE = 'America/Panama';

const AppointmentList: React.FC = () => {
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<string | 'all'>('all');
  const [currentMonth, setCurrentMonth] = useState(toZonedTime(new Date(), TIME_ZONE));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Appointment store
  const appointments = useAppointmentStore(state => state?.appointments || []);
  const loading = useAppointmentStore(state => state?.loading || false);
  const error = useAppointmentStore(state => state?.error || null);
  const fetchUserAppointments = useAppointmentStore(state => state?.fetchUserAppointments);
  const updateAppointmentStatus = useAppointmentStore(state => state?.updateAppointmentStatus);
  
  // Doctor store
  const doctors = useDoctorStore(state => state.doctors);
  const fetchDoctors = useDoctorStore(state => state.fetchDoctors);
  
  // Define days of the week for the calendar header
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Function to get the current user ID
  const getUserId = useCallback((): string => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      // Redirect to login if not authenticated
      navigate('/login');
      return '';
    }
    return userId;
  }, [navigate]);
  
  // Create a stable function reference
  const fetchData = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;
    
    //console.log("Fetching appointments for user:", userId);
    setRefreshing(true);
    
    // Fetch doctors if not already loaded
    if (doctors.length === 0) {
      await fetchDoctors();
    }
    
    // Fetch appointments
    if (fetchUserAppointments) {
      await fetchUserAppointments(userId);
    }
    
    setRefreshing(false);
  }, [fetchUserAppointments, fetchDoctors, doctors.length, getUserId]);

  useEffect(() => {
    fetchData();
    
    // Set up periodic refresh every 30 seconds
    const intervalId = setInterval(() => {
      fetchData();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [fetchData]);

  // Filter doctors by search term
  const filteredDoctors = doctors.filter(doctor => 
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get unique doctor IDs from user's appointments
  const doctorsWithAppointments = useMemo(() => {
    // Extract unique doctor IDs from appointments
    const uniqueDoctorIds = [...new Set(appointments.map(appointment => appointment.doctorId))];
    
    // Filter the doctors array to only include those with appointments
    return doctors.filter(doctor => uniqueDoctorIds.includes(doctor.id));
  }, [appointments, doctors]);

  // Filter the doctors with appointments by search term
  const filteredDoctorsWithAppointments = useMemo(() => {
    return doctorsWithAppointments.filter(doctor => 
      doctor.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [doctorsWithAppointments, searchTerm]);

  // Get the selected doctor's name for display
  const selectedDoctorName = selectedDoctor === 'all' 
    ? 'All doctors' 
    : doctors.find(d => d.id === selectedDoctor)?.name || '';

  // Filter appointments by selected doctor
  const filteredAppointments = appointments.filter(appointment => {
    if (selectedDoctor === 'all') return true;
    return appointment.doctorId === selectedDoctor;
  });
  
  // Filter appointments by selected date
  const selectedDateAppointments = selectedDate ? filteredAppointments.filter(appointment => {
    const appDate = appointment.dateTime 
      ? new Date(appointment.dateTime)
      : new Date(appointment.date || '');
      
    return isSameDay(appDate, selectedDate);
  }) : [];

  // Get all days in the current month
  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };
  
  // Check if a day has appointments
  const dayHasAppointments = (day: Date) => {
    return filteredAppointments.some(appointment => {
      const appDate = appointment.dateTime 
        ? new Date(appointment.dateTime)
        : new Date(appointment.date || '');
        
      return isSameDay(appDate, day);
    });
  };
  
  // Helper to find doctor info
  const findDoctor = (doctorId: string): Doctor | undefined => {
    return doctors.find(d => d.id === doctorId);
  };
  
  // Format appointment date and time
  const formatAppointmentDateTime = (appointment: Appointment): string => {
    if (appointment.dateTime) {
      return format(new Date(appointment.dateTime), 'dd MMM yyyy, h:mm a');
    } else if (appointment.date && appointment.time) {
      const date = new Date(appointment.date);
      const [hour, minute] = appointment.time.split(':').map(Number);
      date.setHours(hour, minute);
      return format(date, 'dd MMM yyyy, h:mm a');
    }
    return 'Unknown date';
  };
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };
  
  // Select a day from the calendar
  const selectDay = (day: Date) => {
    if (dayHasAppointments(day)) {
      setSelectedDate(day);
    }
  };
  
  // Handle doctor selection
  const handleDoctorSelect = (doctorId: string) => {
    setSelectedDoctor(doctorId);
    setSelectedDate(null);
    setDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setDropdownOpen(false);
    };

    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [dropdownOpen]);
  
  // Render the monthly calendar
  const renderCalendar = () => {
    const days = getDaysInMonth();
    const firstDayOfMonth = startOfMonth(currentMonth).getDay();
    
    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-5 flex justify-between items-center">
          <button 
            onClick={goToPreviousMonth} 
            className="text-white hover:bg-white/10 p-2 rounded-full transition-all"
            aria-label="Previous month"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="font-bold text-xl">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <button 
            onClick={goToNextMonth} 
            className="text-white hover:bg-white/10 p-2 rounded-full transition-all"
            aria-label="Next month"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-7 bg-gradient-to-r from-blue-50 to-indigo-50">
          {daysOfWeek.map(day => (
            <div key={day} className="p-3 text-center font-medium text-gray-700 text-sm border-b border-gray-100">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7">
          {/* Empty cells for days before the first of the month */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <div key={`empty-${index}`} className="p-2 h-16 border-t border-l border-gray-100"></div>
          ))}
          
          {/* Calendar days */}
          {days.map(day => {
            const hasAppointments = dayHasAppointments(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div 
                key={format(day, 'yyyy-MM-dd')}
                onClick={() => selectDay(day)}
                className={`
                  p-2 h-16 border-t border-l border-gray-100 relative group transition-all
                  ${hasAppointments ? 'cursor-pointer hover:bg-blue-50' : 'cursor-default'}
                  ${isSelected ? 'bg-blue-100 hover:bg-blue-100' : ''}
                  ${isToday ? 'bg-yellow-50' : ''}
                `}
              >
                <div className={`
                  relative flex flex-col items-center 
                  ${hasAppointments ? 'font-medium' : ''}
                `}>
                  <span className={`
                    flex justify-center items-center w-8 h-8 rounded-full mb-1
                    ${isToday 
                      ? 'bg-yellow-400 text-white ring-2 ring-yellow-200' 
                      : ''
                    }
                    ${isSelected && !isToday 
                      ? 'bg-blue-500 text-white ring-2 ring-blue-200' 
                      : ''
                    }
                    ${!isSelected && !isToday 
                      ? 'text-gray-700' 
                      : ''
                    }
                  `}>
                    {getDate(day)}
                  </span>
                  
                  {hasAppointments && (
                    <div className={`
                      w-5 h-1 rounded-full mt-0.5
                      ${isSelected ? 'bg-blue-500' : 'bg-green-500'}
                    `}></div>
                  )}
                </div>
                
                {/* Hover tooltip showing appointment count */}
                {hasAppointments && (
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center bg-blue-500/10 transition-opacity">
                    <span className="bg-white text-xs font-medium py-1 px-2 rounded-full shadow-sm">
                      {filteredAppointments.filter(appointment => {
                        const appDate = appointment.dateTime 
                          ? new Date(appointment.dateTime)
                          : new Date(appointment.date || '');
                          
                        return isSameDay(appDate, day);
                      }).length} appt(s)
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Handle appointment cancellation
  const handleCancelAppointment = async (appointmentId: string, appointmentDateTime: string) => {
    // Convert appointment time to Date object
    const appointmentDate = new Date(appointmentDateTime);
    const now = new Date();
    
    // Calculate time difference in hours
    const timeDiff = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Check if appointment is less than 2 hours away
    if (timeDiff < 2) {
      alert('Appointments can only be cancelled at least 2 hours before the scheduled time.');
      return;
    }
    
    // Add confirmation dialog
    if (window.confirm('Are you sure you want to cancel this appointment? This action cannot be undone.')) {
      try {
        await updateAppointmentStatus(appointmentId, 'cancelled');
        
        // Track appointment cancellation
        trackCrudEvents.cancelAppointment(appointmentId);
        
        // No need to refresh appointments since the store is already updated
      } catch (error) {
        //console.error('Error cancelling appointment:', error);
        // Show error message to the user
        alert('Failed to cancel the appointment. Please try again.');
      }
    }
  };
  
  // Get status badge color based on status
  const getStatusBadgeClass = (status: string) => {
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
  
  // Get user-friendly status text
  const getStatusText = (status: string) => {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  };

  // If the page is initially loading
  if (loading && !refreshing && appointments.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-gray-600">Loading your appointments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">My Medical Appointments</h1>
        <button 
          onClick={fetchData} 
          disabled={refreshing}
          className={`px-4 py-2 rounded-lg shadow-sm transition-all transform active:scale-95 flex items-center ${
            refreshing 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow'
          }`}
        >
          <svg className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? 'Updating...' : 'Update'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-md shadow-sm mb-6">
          <div className="flex">
            <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p>{error}</p>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="mb-5">
          <label htmlFor="doctor-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Doctor
          </label>
          
          <div className="relative">
            {/* Doctor search input with magnifying glass */}
            <div className="relative mb-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Search doctor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => {
                  e.stopPropagation();
                  setDropdownOpen(true);
                }}
              />
            </div>
            
            {/* Selected Doctor Display */}
            <div 
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 cursor-pointer bg-white hover:border-blue-300 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                setDropdownOpen(!dropdownOpen);
              }}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 font-medium">{selectedDoctorName}</span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${dropdownOpen ? 'transform rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            {/* Doctor Dropdown */}
            {dropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-xl max-h-60 rounded-lg py-1 overflow-auto border border-gray-200 animate-fadeIn">
                <div 
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => handleDoctorSelect('all')}
                >
                  All doctors
                </div>
                {filteredDoctorsWithAppointments.length > 0 ? (
                  filteredDoctorsWithAppointments.map(doctor => (
                    <div 
                      key={doctor.id} 
                      className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => handleDoctorSelect(doctor.id)}
                    >
                      {doctor.name}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-2 text-sm text-gray-500 italic">
                    {searchTerm ? 'No matching doctors found' : 'No doctors with appointments'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Monthly Calendar */}
        {renderCalendar()}
        
        {/* Appointment Details */}
        {selectedDate && (
          <div className="mt-8 pt-4 border-t border-gray-200">
            <div className="flex items-center mb-4">
              <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-800">
                Appointments for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </h3>
            </div>
            
            {selectedDateAppointments.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-600">No appointments scheduled for this date.</p>
              </div>
            ) : (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                {selectedDateAppointments.map(appointment => {
                  const doctor = findDoctor(appointment.doctorId);
                  const statusClass = getStatusBadgeClass(appointment.status);
                  const statusText = getStatusText(appointment.status);
                  
                  return (
                    <div key={appointment.id} className="bg-white border rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-lg">
                            {appointment.patientName || 'Patient'}
                          </h4>
                          <div className="flex items-center mt-1 text-gray-500">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm">{formatAppointmentDateTime(appointment)}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClass} inline-block whitespace-nowrap shadow-sm`}>
                          {statusText}
                        </span>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Doctor</p>
                            <p className="text-sm font-medium">{doctor?.name || (appointment as any).doctorName || 'Unknown'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Specialty</p>
                            <p className="text-sm font-medium">{doctor?.specialty || 'General'}</p>
                          </div>
                        </div>
                        
                        {doctor?.location && (
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Location</p>
                              <p className="text-sm font-medium">{doctor.location}</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Cancel Button - only show for non-cancelled appointments */}
                        {appointment.status !== 'cancelled' && (
                          <div className="mt-6 pt-4 border-t border-gray-100">
                            <button
                              onClick={() => handleCancelAppointment(appointment.id, appointment.dateTime || `${appointment.date}T${appointment.time}`)}
                              className="w-full px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center shadow-sm"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Cancel Appointment
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        
        {/* Summary counts */}
        <div className="mt-8 pt-6 border-t border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5 shadow-sm border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-blue-600">Total</p>
              <div className="bg-blue-100 rounded-full p-1.5">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">{appointments.length}</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-5 shadow-sm border border-green-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-green-600">Confirmed</p>
              <div className="bg-green-100 rounded-full p-1.5">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {appointments.filter(app => app.status === 'confirmed').length}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-5 shadow-sm border border-yellow-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-yellow-600">Pending</p>
              <div className="bg-yellow-100 rounded-full p-1.5">
                <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {appointments.filter(app => app.status === 'pending').length}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-lg p-5 shadow-sm border border-red-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-red-600">Cancelled</p>
              <div className="bg-red-100 rounded-full p-1.5">
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {appointments.filter(app => app.status === 'cancelled').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentList; 