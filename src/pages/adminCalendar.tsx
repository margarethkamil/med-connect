import React, { useEffect, useState, useCallback } from 'react';
import { format, getDate, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useNavigate } from 'react-router-dom';
import { useAppointmentStore } from '../store/appointmentStore';
import { useDoctorStore } from '../store/doctorStore';
import { Appointment } from '../types/appointment';
import { getAllAppointments } from '../api/client';
import { trackCrudEvents } from '../services/analytics';

// Panama time zone
const TIME_ZONE = 'America/Panama';

const AdminCalendar: React.FC = () => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(toZonedTime(new Date(), TIME_ZONE));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMoreAppointments, setHasMoreAppointments] = useState(false);
  const [lastDocId, setLastDocId] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    patientName: '',
    patientEmail: '',
    status: '',
    doctorId: ''
  });
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Appointment store
  const appointments = useAppointmentStore(state => state?.appointments || []);
  const loading = useAppointmentStore(state => state?.loading || false);
  const error = useAppointmentStore(state => state?.error || null);
  const fetchAllAppointments = useAppointmentStore(state => state?.fetchAllAppointments);
  const updateAppointmentDetails = useAppointmentStore(state => state?.updateAppointmentDetails);

  // Doctor store
  const doctors = useDoctorStore(state => state.doctors);
  const fetchDoctors = useDoctorStore(state => state.fetchDoctors);

  // Define days of the week for the calendar header
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Check if user is an admin
  const checkAdmin = useCallback(() => {
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');

    if (!userId || userRole !== 'admin') {
      navigate('/login');
      return false;
    }
    return true;
  }, [navigate]);

  // Create a stable function reference for data fetching
  const fetchData = useCallback(async () => {
    if (!checkAdmin()) return;
    
    setRefreshing(true);
    
    // Fetch doctors if not already loaded
    if (doctors.length === 0) {
      await fetchDoctors();
    }
    
    // Fetch all appointments with status filter if set
    if (fetchAllAppointments) {
      // Reset pagination when changing filters
      setLastDocId(null);
      await fetchAllAppointments(statusFilter ? { status: statusFilter } : undefined);
    }
    
    setRefreshing(false);
  }, [fetchAllAppointments, fetchDoctors, doctors.length, checkAdmin, statusFilter]);

  useEffect(() => {
    fetchData();
    
    // Set up periodic refresh every minute
    const intervalId = setInterval(() => {
      fetchData();
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, [fetchData]);

  // Get all days in the current month
  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  // Check if a day has appointments
  const dayHasAppointments = (day: Date) => {
    return appointments.some(appointment => {
      const appDate = appointment.dateTime 
        ? new Date(appointment.dateTime)
        : new Date(appointment.date || '');
        
      return isSameDay(appDate, day);
    });
  };

  // Get appointments count for a specific day
  const getAppointmentsCount = (day: Date) => {
    return appointments.filter(appointment => {
      const appDate = appointment.dateTime 
        ? new Date(appointment.dateTime)
        : new Date(appointment.date || '');
        
      return isSameDay(appDate, day);
    }).length;
  };

  // Filter appointments by selected date
  const selectedDateAppointments = selectedDate ? appointments.filter(appointment => {
    const appDate = appointment.dateTime 
      ? new Date(appointment.dateTime)
      : new Date(appointment.date || '');
      
    return isSameDay(appDate, selectedDate);
  }) : [];

  // Load more appointments for the selected date
  const loadMoreAppointments = async () => {
    if (isLoadingMore || !lastDocId) return;
    
    setIsLoadingMore(true);
    try {
      const options = {
        lastDoc: lastDocId,
        ...(statusFilter ? { status: statusFilter } : {})
      };
      
      const result = await getAllAppointments(options);
      
      // Update the appointments store with new appointments
      useAppointmentStore.setState(state => ({
        ...state,
        appointments: [...state.appointments, ...result.appointments],
      }));
      
      // Update pagination state
      setHasMoreAppointments(result.hasMore);
      setLastDocId(result.lastDoc);
    } catch (error) {
      //console.error('Error loading more appointments:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // When a new date is selected, reset pagination
  useEffect(() => {
    if (selectedDate) {
      // Reset pagination state when selecting a new date
      setLastDocId(null);
      setHasMoreAppointments(false);
    }
  }, [selectedDate]);

  // Update pagination state after fetching appointments
  useEffect(() => {
    // After initial load, check if there might be more appointments to load
    if (appointments.length > 0 && !lastDocId) {
      setLastDocId(appointments[appointments.length - 1].id);
      setHasMoreAppointments(true); // Assume there might be more until we know otherwise
    }
  }, [appointments, lastDocId]);

  // Sort appointments by time
  const sortedAppointments = [...selectedDateAppointments].sort((a, b) => {
    const timeA = a.dateTime 
      ? new Date(a.dateTime).getTime()
      : new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      
    const timeB = b.dateTime 
      ? new Date(b.dateTime).getTime()
      : new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      
    return timeA - timeB;
  });

  // Helper to find doctor info
  const findDoctorName = (doctorId: string): string => {
    return doctors.find(d => d.id === doctorId)?.name || 'Unknown Doctor';
  };

  // Format appointment time
  const formatAppointmentTime = (appointment: Appointment): string => {
    if (appointment.dateTime) {
      return format(new Date(appointment.dateTime), 'h:mm a');
    } else if (appointment.time) {
      const [hour, minute] = appointment.time.split(':').map(Number);
      const date = new Date();
      date.setHours(hour, minute);
      return format(date, 'h:mm a');
    }
    return 'Unknown time';
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
    setSelectedDate(day);
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

  // Apply status filter
  const handleStatusFilterChange = (status: string | null) => {
    setStatusFilter(status);
    // When changing filter, we'll want to reset the pagination
    setLastDocId(null);
    setHasMoreAppointments(false);
    
    // Fetch appointments with new filter
    if (fetchAllAppointments) {
      fetchAllAppointments(status ? { status } : undefined);
    }
  };

  // Open edit modal for an appointment
  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setUpdateError(null);
    setEditFormData({
      patientName: appointment.patientName || '',
      patientEmail: appointment.patientEmail || '',
      status: appointment.status || 'pending',
      doctorId: appointment.doctorId || ''
    });
    setIsEditModalOpen(true);
  };

  // Handle form field changes
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Save appointment changes
  const handleSaveAppointment = async () => {
    if (!editingAppointment) return;
    
    // Reset error
    setUpdateError(null);
    
    try {
      // Create the update object
      const updateData = {
        patientName: editFormData.patientName,
        patientEmail: editFormData.patientEmail,
        status: editFormData.status,
        doctorId: editFormData.doctorId
      };
      
      // Log the update data for debugging
      //console.log('Updating appointment:', editingAppointment.id);
      //console.log('Update data:', updateData);
      
      // Update all editable fields
      await updateAppointmentDetails(editingAppointment.id, updateData);
      
      // Track appointment update
      trackCrudEvents.updateAppointment(editingAppointment.id, updateData.status);
      
      // Close the modal and refresh the data
      setIsEditModalOpen(false);
      setEditingAppointment(null);
      
      // Refetch the data to show the updates
      fetchData();
    } catch (error) {
      //console.error('Error updating appointment:', error);
      setUpdateError(error instanceof Error ? error.message : 'Failed to update appointment');
    }
  };

  // Render the monthly calendar
  const renderCalendar = () => {
    const days = getDaysInMonth();
    const firstDayOfMonth = startOfMonth(currentMonth).getDay();
    
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-indigo-600 text-white p-4 flex justify-between items-center">
          <button 
            onClick={goToPreviousMonth} 
            className="text-white hover:bg-indigo-700 p-2 rounded"
            aria-label="Previous month"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <h3 className="font-bold text-xl">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <button 
            onClick={goToNextMonth} 
            className="text-white hover:bg-indigo-700 p-2 rounded"
            aria-label="Next month"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {/* Day names row */}
        <div className="grid grid-cols-7 bg-indigo-50">
          {daysOfWeek.map(day => (
            <div key={day} className="p-2 text-center font-medium text-indigo-800 text-sm">
              {/* Show first letter on mobile, full name on larger screens */}
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.charAt(0)}</span>
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells for days before the first of the month */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <div key={`empty-${index}`} className="p-1 sm:p-2 h-12 sm:h-16 border-t border-l border-gray-200"></div>
          ))}
          
          {/* Calendar days */}
          {days.map(day => {
            const hasAppointments = dayHasAppointments(day);
            const appointmentsCount = getAppointmentsCount(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div 
                key={format(day, 'yyyy-MM-dd')}
                onClick={() => selectDay(day)}
                className={`
                  p-1 h-12 sm:h-16 border-t border-l border-gray-200 text-center relative cursor-pointer hover:bg-indigo-50
                  ${isSelected ? 'bg-indigo-100 font-bold' : ''}
                  ${isToday ? 'bg-yellow-50' : ''}
                `}
              >
                <div className="flex flex-col h-full">
                  <span className={`
                    self-center w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-yellow-400 text-white' : 'text-gray-700'}
                    ${isSelected ? 'ring-2 ring-indigo-500' : ''}
                  `}>
                    {getDate(day)}
                  </span>
                  
                  {hasAppointments && (
                    <div className="mt-1">
                      <span className={`
                        text-xs font-medium px-1 sm:px-2 py-0.5 sm:py-1 rounded-full
                        ${appointmentsCount > 0 ? 'bg-indigo-100 text-indigo-800' : 'hidden'}
                      `}>
                        {appointmentsCount} {appointmentsCount === 1 ? (
                          <span className="hidden sm:inline">appt</span>
                        ) : (
                          <span className="hidden sm:inline">appts</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // If the page is initially loading
  if (loading && !refreshing && appointments.length === 0) {
    return (
      <div className="py-10 text-center">
        <div className="flex flex-col items-center justify-center">
          <svg className="animate-spin h-10 w-10 text-indigo-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold text-gray-900">Admin Calendar</h1>
          <p className="text-gray-600">View and manage all appointments</p>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-2 sm:mt-0">
          {/* Status filter */}
          <div className="flex items-center gap-1 sm:gap-2">
            <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
              Status:
            </label>
            <select
              id="status-filter"
              value={statusFilter || ''}
              onChange={(e) => handleStatusFilterChange(e.target.value || null)}
              className="rounded-md border-gray-300 shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <span className={`inline-block w-3 h-3 rounded-full bg-yellow-400`}></span>
            <span className="text-sm text-gray-600">Today</span>
          </div>
          
          <button 
            onClick={fetchData} 
            disabled={refreshing}
            className={`
              px-4 py-2 rounded-md flex items-center gap-1 sm:gap-2
              ${refreshing ? 'bg-gray-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'}
            `}
          >
            {refreshing ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Active Filters display */}
      {statusFilter && (
        <div className="flex items-center mt-2">
          <span className="text-sm text-gray-600 mr-2">Active filters:</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(statusFilter)}`}>
            Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
            <button
              type="button"
              onClick={() => handleStatusFilterChange(null)}
              className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-indigo-100 text-indigo-500 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500"
            >
              <span className="sr-only">Remove status filter</span>
              <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
              </svg>
            </button>
          </span>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded-md mb-4">
          <p>Error: {error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 sm:gap-6">
        <div className="lg:col-span-4">
          {renderCalendar()}
          
          {/* Summary statistics */}
          <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <div className="bg-indigo-100 p-3 sm:p-4 rounded-lg shadow">
              <p className="text-xl sm:text-2xl font-bold text-indigo-700">{appointments.length}</p>
              <p className="text-xs sm:text-sm text-indigo-600">Total appointments</p>
            </div>
            <div className="bg-green-100 p-3 sm:p-4 rounded-lg shadow">
              <p className="text-xl sm:text-2xl font-bold text-green-700">
                {appointments.filter(app => app.status === 'confirmed').length}
              </p>
              <p className="text-xs sm:text-sm text-green-600">Confirmed</p>
            </div>
            <div className="bg-yellow-100 p-3 sm:p-4 rounded-lg shadow">
              <p className="text-xl sm:text-2xl font-bold text-yellow-700">
                {appointments.filter(app => app.status === 'pending').length}
              </p>
              <p className="text-xs sm:text-sm text-yellow-600">Pending</p>
            </div>
            <div className="bg-red-100 p-3 sm:p-4 rounded-lg shadow">
              <p className="text-xl sm:text-2xl font-bold text-red-700">
                {appointments.filter(app => app.status === 'cancelled').length}
              </p>
              <p className="text-xs sm:text-sm text-red-600">Cancelled</p>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-3 bg-white rounded-lg shadow p-3 sm:p-4 mt-4 lg:mt-0">
          {selectedDate ? (
            <>
              <h3 className="text-base sm:text-lg font-semibold pb-2 sm:pb-3 border-b border-gray-200">
                Appointments for {format(selectedDate, 'EEE, MMM d, yyyy')}
              </h3>
              
              {sortedAppointments.length === 0 ? (
                <div className="py-6 sm:py-8 text-center">
                  <p className="text-gray-500">No appointments for this date</p>
                </div>
              ) : (
                <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4 max-h-[400px] sm:max-h-[600px] overflow-y-auto">
                  {sortedAppointments.map(appointment => {
                    const doctorName = findDoctorName(appointment.doctorId);
                    const statusClass = getStatusBadgeClass(appointment.status);
                    const statusText = getStatusText(appointment.status);
                    
                    return (
                      <div 
                        key={appointment.id} 
                        className="border-l-4 border-indigo-500 pl-3 sm:pl-4 py-2 sm:py-3 hover:bg-gray-50 rounded-r"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-semibold text-gray-900">{formatAppointmentTime(appointment)}</span>
                            <h4 className="font-medium text-gray-800">{appointment.patientName || 'Unknown Patient'}</h4>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              <span className="inline-block w-3 h-3 sm:w-4 sm:h-4 bg-indigo-100 rounded-full mr-1"></span>
                              {doctorName}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">
                              <span className="font-medium">User:</span> {appointment.patientEmail || 'Unknown'}
                            </p>
                            
                            {/* Edit button */}
                            <button
                              onClick={() => handleEditAppointment(appointment)}
                              className="mt-2 inline-flex items-center px-2 py-1 sm:px-2.5 sm:py-1.5 border border-indigo-300 text-xs font-medium rounded text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                            {statusText}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  
                  {hasMoreAppointments && (
                    <div className="flex justify-center py-2 sm:py-3">
                      <button
                        onClick={loadMoreAppointments}
                        disabled={isLoadingMore}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md 
                          ${isLoadingMore ? 'bg-gray-300' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                      >
                        {isLoadingMore ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-3 w-3 sm:h-4 sm:w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Loading more...
                          </span>
                        ) : (
                          'Load More Appointments'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="py-12 sm:py-16 text-center">
              <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No date selected</h3>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">Select a date from the calendar to view appointments.</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Appointment Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
            {/* Background overlay with blur */}
            <div className="fixed inset-0 backdrop-blur-md bg-black/30 transition-opacity" aria-hidden="true"></div>
            
            {/* Modal content */}
            <div 
              className="inline-block align-bottom bg-white rounded-lg shadow-xl p-4 sm:p-6 max-w-md w-full relative z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Edit Appointment</h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {updateError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
                  <p className="text-sm">{updateError}</p>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="patientName" className="block text-sm font-medium text-gray-700">Patient Name</label>
                  <input
                    type="text"
                    id="patientName"
                    name="patientName"
                    value={editFormData.patientName}
                    onChange={handleEditFormChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="patientEmail" className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    id="patientEmail"
                    name="patientEmail"
                    value={editFormData.patientEmail}
                    onChange={handleEditFormChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={editFormData.status}
                    onChange={handleEditFormChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="doctorId" className="block text-sm font-medium text-gray-700">Doctor</label>
                  <select
                    id="doctorId"
                    name="doctorId"
                    value={editFormData.doctorId}
                    onChange={handleEditFormChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    {doctors.map(doctor => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mt-5 flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  className="w-full sm:w-auto py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="w-full sm:w-auto py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={handleSaveAppointment}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendar; 