import React, { useEffect, useCallback, useState } from 'react';
import { useAppointmentStore } from '../store/appointmentStore';
import { useDoctorStore } from '../store/doctorStore';
import { Appointment } from '../types/appointment';
import { Doctor } from '../types/doctor';
import { format, getMonth, getYear, getDate, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
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
    
    console.log("Fetching appointments for user:", userId);
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
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-blue-500 text-white p-4 flex justify-between items-center">
          <button 
            onClick={goToPreviousMonth} 
            className="text-white hover:bg-blue-600 p-1 rounded"
          >
            &lt;
          </button>
          <h3 className="font-bold text-xl">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <button 
            onClick={goToNextMonth} 
            className="text-white hover:bg-blue-600 p-1 rounded"
          >
            &gt;
          </button>
        </div>
        
        <div className="grid grid-cols-7 bg-gray-100">
          {daysOfWeek.map(day => (
            <div key={day} className="p-2 text-center font-medium text-gray-600 text-sm">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7">
          {/* Empty cells for days before the first of the month */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <div key={`empty-${index}`} className="p-2 h-12 border-t border-l border-gray-200"></div>
          ))}
          
          {/* Calendar days */}
          {days.map(day => {
            const hasAppointments = dayHasAppointments(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            
            return (
              <div 
                key={format(day, 'yyyy-MM-dd')}
                onClick={() => selectDay(day)}
                className={`
                  p-1 h-12 border-t border-l border-gray-200 text-center relative
                  ${hasAppointments ? 'cursor-pointer' : 'cursor-default'}
                  ${isSelected ? 'bg-blue-100' : ''}
                `}
              >
                <span className={`
                  inline-flex justify-center items-center w-8 h-8 rounded-full
                  ${hasAppointments 
                    ? 'bg-green-500 text-white' 
                    : 'text-gray-700'
                  }
                  ${isSelected ? 'ring-2 ring-blue-500' : ''}
                `}>
                  {getDate(day)}
                </span>
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
        console.error('Error cancelling appointment:', error);
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Medical Appointments</h1>
        <button 
          onClick={fetchData} 
          disabled={refreshing}
          className={`px-4 py-2 rounded ${refreshing ? 'bg-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
        >
          {refreshing ? 'Updating...' : 'Update'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded-md">
          <p>Error: {error}</p>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow p-4">
        <div className="mb-4">
          <label htmlFor="doctor-select" className="block text-sm font-medium text-gray-700 mb-1">
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
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 cursor-pointer bg-white"
              onClick={(e) => {
                e.stopPropagation();
                setDropdownOpen(!dropdownOpen);
              }}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">{selectedDoctorName}</span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${dropdownOpen ? 'transform rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            {/* Doctor Dropdown */}
            {dropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 overflow-auto border border-gray-200">
                <div 
                  className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer"
                  onClick={() => handleDoctorSelect('all')}
                >
                  All doctors
                </div>
                {filteredDoctors.map(doctor => (
                  <div 
                    key={doctor.id} 
                    className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer"
                    onClick={() => handleDoctorSelect(doctor.id)}
                  >
                    {doctor.name}
                  </div>
                ))}
                {filteredDoctors.length === 0 && searchTerm && (
                  <div className="px-3 py-2 text-sm text-gray-500 italic">
                    No doctors found
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
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">
              Appointments for {format(selectedDate, 'EEEE d MMMM, yyyy')}
            </h3>
            
            {selectedDateAppointments.length === 0 ? (
              <p className="text-gray-600">No appointments for this date.</p>
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {selectedDateAppointments.map(appointment => {
                  const doctor = findDoctor(appointment.doctorId);
                  const statusClass = getStatusBadgeClass(appointment.status);
                  const statusText = getStatusText(appointment.status);
                  
                  return (
                    <div key={appointment.id} className="bg-white border rounded-lg shadow-sm p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold">
                            {appointment.patientName || 'Patient'}
                          </h4>
                          <p className="text-sm text-gray-600">{formatAppointmentDateTime(appointment)}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                          {statusText}
                        </span>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="flex items-center text-sm">
                          <span className="font-semibold mr-2">Doctor:</span> 
                          {doctor?.name || (appointment as any).doctorName || 'Unknown'}
                        </p>
                        <p className="flex items-center text-sm mt-1">
                          <span className="font-semibold mr-2">Specialty:</span> 
                          {doctor?.specialty || 'General'}
                        </p>
                        <p className="flex items-center text-sm mt-1">
                          <span className="font-semibold mr-2">Location:</span> 
                          {doctor?.location || 'Main consultation'}
                        </p>
                        
                        {/* Cancel Button - only show for non-cancelled appointments */}
                        {appointment.status !== 'cancelled' && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <button
                              onClick={() => handleCancelAppointment(appointment.id, appointment.dateTime || `${appointment.date}T${appointment.time}`)}
                              className="px-3 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-md hover:bg-red-100 transition-colors"
                            >
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
        <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-700">{appointments.length}</p>
            <p className="text-sm text-blue-600">Total appointments</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-700">
              {appointments.filter(app => app.status === 'confirmed').length}
            </p>
            <p className="text-sm text-green-600">Confirmed</p>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-700">
              {appointments.filter(app => app.status === 'pending').length}
            </p>
            <p className="text-sm text-yellow-600">Pending</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-700">
              {appointments.filter(app => app.status === 'cancelled').length}
            </p>
            <p className="text-sm text-red-600">Cancelled</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentList; 