import React, { useState, useEffect } from 'react';
import { Doctor } from '../types/doctor';
import { useDoctorStore } from '../store/doctorStore';
import { useAppointmentStore, DEMO_USER_ID } from '../store/appointmentStore';
import { format, parseISO, addDays, isBefore, isSameDay, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useNavigate } from 'react-router-dom';
import AppointmentNotification from './AppointmentNotification';
import { checkSlotAvailable } from '../api/client';

// Panama time zone (GMT-5)
const PANAMA_TIMEZONE = 'America/Panama';

// Business hours (8am to 5pm, 1-hour slots)
const BUSINESS_HOURS = [
  '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00'
];

interface BookingModalProps {
  doctor: Doctor;
  isOpen: boolean;
  onClose: () => void;
}

interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isSelected: boolean;
  hasAvailability: boolean;
}

const BookingModal: React.FC<BookingModalProps> = ({ doctor, isOpen, onClose }) => {
  const navigate = useNavigate();
  
  // Get store functions
  const doctorsWithAvailability = useDoctorStore(state => state.doctorsWithAvailability);
  const fetchDoctorAvailabilities = useDoctorStore(state => state.fetchDoctorAvailabilities);
  const bookNewAppointment = useAppointmentStore(state => state.bookNewAppointment);
  const setDoctorAvailability = useDoctorStore(state => state.setDoctorAvailability);
  
  // State for calendar and booking
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [availableTimesForDate, setAvailableTimesForDate] = useState<string[]>([]);
  const [bookedTimesForDate, setBookedTimesForDate] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<'calendar' | 'time' | 'form' | 'success'>('calendar');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [appointmentDateTime, setAppointmentDateTime] = useState('');
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    reason: ''
  });
  
  // Fetch real availability data when the modal is opened
  useEffect(() => {
    if (isOpen && doctor && doctor.id) {
      // Check if we already have availability data in the doctor object
      if (!doctor.availability || doctor.availability.length === 0) {
        // Only fetch if not already available
        fetchDoctorAvailabilities([doctor.id]);
      } else {
        // If doctor already has availability data, use it to update the store
        setDoctorAvailability(doctor.id, doctor.availability);
      }
    }
  }, [isOpen, doctor?.id, doctor?.availability, fetchDoctorAvailabilities, setDoctorAvailability]);
  
  // Format date to readable string
  const formatDateToString = (date: Date): string => {
    const panamaDate = toZonedTime(date, PANAMA_TIMEZONE);
    return format(panamaDate, 'EEEE, MMMM d, yyyy');
  };
  
  // Format time to readable string
  const formatTimeToString = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return format(date, 'h:mm a');
  };

  // Convert calendar date and time slot to full datetime in UTC format
  const createDateTimeString = (date: Date, timeSlot: string): string => {
    const [hours, minutes] = timeSlot.split(':').map(Number);
    
    // Create a date in the local timezone
    const localDate = new Date(date);
    localDate.setHours(hours, minutes, 0, 0);
    
    // Convert to ISO string which will be in UTC
    // Format: "2025-04-25T15:00:00Z"
    return localDate.toISOString().replace('.000Z', 'Z');
  };
  
  // Generate calendar days for the current month view
  const generateCalendarDays = () => {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    // Get the day of week for the first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDayOfMonth.getDay();
    
    // Calculate days from previous month to show
    const daysFromPrevMonth = firstDayOfWeek;
    
    // Array to hold all calendar days
    const days: CalendarDay[] = [];
    
    // Add days from previous month
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const lastDayOfPrevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();
    
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), lastDayOfPrevMonth - i);
      
      days.push({
        date,
        dayOfMonth: date.getDate(),
        isCurrentMonth: false,
        isToday: isSameDay(date, today),
        isPast: isBefore(date, tomorrow),
        isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
        hasAvailability: checkDateHasAvailability(date)
      });
    }
    
    // Add days from current month
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      
      days.push({
        date,
        dayOfMonth: i,
        isCurrentMonth: true,
        isToday: isSameDay(date, today),
        isPast: isBefore(date, tomorrow),
        isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
        hasAvailability: checkDateHasAvailability(date)
      });
    }
    
    // Calculate how many days from next month we need to complete the calendar grid (6 rows x 7 days)
    const totalDaysNeeded = 42; // 6 weeks
    const daysFromNextMonth = totalDaysNeeded - days.length;
    
    // Add days from next month
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    
    for (let i = 1; i <= daysFromNextMonth; i++) {
      const date = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), i);
      
      days.push({
        date,
        dayOfMonth: i,
        isCurrentMonth: false,
        isToday: isSameDay(date, today),
        isPast: isBefore(date, tomorrow),
        isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
        hasAvailability: checkDateHasAvailability(date)
      });
    }
    
    setCalendarDays(days);
  };
  
  // Check if a date has any available slots
  const checkDateHasAvailability = (date: Date): boolean => {
    if (!doctor?.id) return false;
    
    // First check if availability is directly in the doctor object
    const directAvailabilities = doctor.availability || [];
    
    // Then check the store as a fallback
    const storeAvailabilities = doctorsWithAvailability[doctor.id] || [];
    
    // Use whatever availability data we have
    const availabilities = directAvailabilities.length > 0
      ? directAvailabilities
      : storeAvailabilities;
    
    if (availabilities.length === 0) return false;
    
    // Each date in the API response indicates a full available day (marked with 08:00:00Z)
    // We just need to check if this date exists in the list
    const dateString = format(date, 'yyyy-MM-dd');
    return availabilities.some(slot => {
      try {
        const slotDate = new Date(slot);
        return format(slotDate, 'yyyy-MM-dd') === dateString;
      } catch (e) {
        return false;
      }
    });
  };
  
  // Get available times for the selected date
  const getAvailableTimesForDate = async (date: Date) => {
    if (!doctor?.id || !date) {
      setAvailableTimesForDate([]);
      setBookedTimesForDate([]);
      return;
    }
    
    // First check if availability is directly in the doctor object
    const directAvailabilities = doctor.availability || [];
    
    // Then check the store as a fallback
    const storeAvailabilities = doctorsWithAvailability[doctor.id] || [];
    
    // Use whatever availability data we have
    const availabilities = directAvailabilities.length > 0
      ? directAvailabilities
      : storeAvailabilities;
    
    // Format the date string for comparison
    const dateString = format(date, 'yyyy-MM-dd');
    
    // Check if the selected date is in the list of available days
    const isDayAvailable = availabilities.some(slot => {
      try {
        const slotDate = new Date(slot);
        return format(slotDate, 'yyyy-MM-dd') === dateString;
      } catch (e) {
        return false;
      }
    });
    
    if (!isDayAvailable) {
      // If day is not available, no slots to show
      setAvailableTimesForDate([]);
      setBookedTimesForDate(BUSINESS_HOURS);
      return;
    }
    
    // For available days, all business hours are initially available
    // Now let's check each time slot's actual availability
    setIsCheckingAvailability(true);
    
    try {
      const availableSlots: string[] = [];
      const bookedSlots: string[] = [];
      
      // Check each business hour
      const availabilityChecks = BUSINESS_HOURS.map(async (time) => {
        const dateTimeStr = createDateTimeString(date, time);
        const isAvailable = await checkSlotAvailable(doctor.id, dateTimeStr);
        return { time, isAvailable };
      });
      
      // Wait for all availability checks to complete
      const results = await Promise.all(availabilityChecks);
      
      // Process results
      results.forEach(({ time, isAvailable }) => {
        if (isAvailable) {
          availableSlots.push(time);
        } else {
          bookedSlots.push(time);
        }
      });
      
      setAvailableTimesForDate(availableSlots);
      setBookedTimesForDate(bookedSlots);
    } catch (error) {
      console.error("Error checking time slot availability:", error);
      // Fallback to showing all slots as available
      setAvailableTimesForDate([...BUSINESS_HOURS]);
      setBookedTimesForDate([]);
    } finally {
      setIsCheckingAvailability(false);
    }
  };
  
  // Handle date selection
  const handleDateSelect = (day: CalendarDay) => {
    if (day.isPast || !day.hasAvailability) return;
    
    setSelectedDate(day.date);
    getAvailableTimesForDate(day.date);
    setCurrentStep('time');
  };
  
  // Handle month navigation
  const goToPreviousMonth = () => {
    setCurrentMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(newMonth.getMonth() - 1);
      return newMonth;
    });
  };
  
  const goToNextMonth = () => {
    setCurrentMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(newMonth.getMonth() + 1);
      return newMonth;
    });
  };
  
  // Handle time selection
  const handleTimeSelect = (time: string) => {
    if (!selectedDate) return;
    
    setSelectedTime(time);
    setCurrentStep('form');
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Function to get the current user ID
  const getUserId = (): string => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      // Redirect to login if not authenticated
      window.location.href = '/login';
      return '';
    }
    return userId;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !doctor.id) return;
    
    setIsSubmitting(true);
    
    try {
      // Format the appointment date for booking and display
      const dateTimeStr = createDateTimeString(selectedDate, selectedTime);
      const dateTime = parseISO(dateTimeStr);
      const formattedDate = format(dateTime, 'MMMM d, yyyy');
      const formattedTime = format(dateTime, 'h:mm a');
      const fullDateTime = `${formattedDate} at ${formattedTime}`;
      
      // Get the current user ID from localStorage
      const userId = getUserId();
      if (!userId) return;
      
      // We've already confirmed availability when selecting the time slot
      // But do a final quick check in case another user booked it in the meantime
      console.log(`Performing final availability check for: ${dateTimeStr}`);
      const isStillAvailable = await checkSlotAvailable(doctor.id, dateTimeStr);
      
      if (!isStillAvailable) {
        alert("Sorry, this time slot was just booked by someone else. Please select another time.");
        // Refresh availabilities
        getAvailableTimesForDate(selectedDate);
        setCurrentStep('time');
        setIsSubmitting(false);
        return;
      }
      
      // Create appointment request matching the API requirements
      const appointmentData = {
        doctorId: doctor.id,
        userId: userId,
        dateTime: dateTimeStr,
        patientName: `${formData.firstName} ${formData.lastName}`,
        patientEmail: formData.email,
        patientPhone: formData.phone,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        reason: formData.reason
      };
      
      console.log('Booking appointment with data:', appointmentData);
      
      // Book the appointment
      await bookNewAppointment(appointmentData);
      
      // Set success state
      setAppointmentDateTime(fullDateTime);
      setCurrentStep('success');
      
      // Show the notification after modal closes
      setTimeout(() => {
        handleClose();
        setShowNotification(true);
      }, 2000);
      
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert("Sorry, there was an error booking your appointment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle modal close
  const handleClose = () => {
    onClose();
    // Reset state after a small delay to avoid flashing UI
    setTimeout(() => {
      setCurrentStep('calendar');
      setSelectedDate(null);
      setSelectedTime(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        reason: ''
      });
    }, 200);
  };
  
  // Go back to previous step
  const handleBack = () => {
    if (currentStep === 'time') setCurrentStep('calendar');
    if (currentStep === 'form') setCurrentStep('time');
  };
  
  // Update calendar when month changes
  useEffect(() => {
    generateCalendarDays();
  }, [currentMonth, selectedDate, doctor?.id, doctorsWithAvailability]);
  
  // Render calendar view
  const renderCalendar = () => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
      <>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Select a Date
        </h3>
        
        {/* Calendar controls */}
        <div className="flex items-center justify-between mb-4 bg-indigo-50 rounded-lg p-2 border border-indigo-100">
          <h4 className="text-base font-medium text-indigo-800 px-2">
            {format(currentMonth, 'MMMM yyyy')}
          </h4>
          <div className="flex space-x-1">
            <button
              onClick={goToPreviousMonth}
              className="p-2 rounded-md hover:bg-indigo-100 text-indigo-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-md hover:bg-indigo-100 text-indigo-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Calendar grid */}
        <div className="mb-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1 bg-blue-50 rounded-t-lg">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-medium text-blue-800 py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1 bg-gray-50 p-1 rounded-b-lg border border-gray-100">
            {calendarDays.map((day, i) => {
              // Determine cell styling based on status
              let cellClasses = "relative flex items-center justify-center h-10 rounded-md transition-all duration-150";
              let textClasses = "text-sm";
              
              if (!day.isCurrentMonth) {
                textClasses += " text-gray-400";
                cellClasses += " opacity-50";
              } else if (day.isToday) {
                textClasses += " font-bold text-blue-600";
              } else {
                textClasses += " text-gray-900";
              }
              
              if (day.isSelected) {
                cellClasses += " bg-blue-100 ring-2 ring-blue-500 shadow";
              }
              
              if (day.isPast || !day.hasAvailability) {
                cellClasses += " bg-gray-100 cursor-not-allowed";
                textClasses += " text-gray-400";
              } else {
                cellClasses += " bg-white hover:bg-blue-50 hover:shadow cursor-pointer";
              }
              
              return (
                <button
                  key={`${day.date.toISOString()}-${i}`}
                  className={cellClasses}
                  onClick={() => handleDateSelect(day)}
                  disabled={day.isPast || !day.hasAvailability}
                  title={day.hasAvailability ? 'Available' : 'No available slots'}
                >
                  <span className={textClasses}>{day.dayOfMonth}</span>
                  
                  {/* Availability indicator */}
                  {day.hasAvailability && !day.isPast && (
                    <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-md text-sm text-amber-800 flex items-start">
          <svg className="w-5 h-5 mr-2 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>
            Select an available date to see time slots. Days with available appointments are indicated with a green dot. Past dates cannot be selected.
          </p>
        </div>
      </>
    );
  };
  
  // Time selection component with improved UI for availability
  const renderTimeSelection = () => {
    if (!selectedDate) return null;
    
    return (
      <>
        <div className="mb-4">
          <button 
            onClick={handleBack}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to calendar
          </button>
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Select a time on {formatDateToString(selectedDate)}
        </h3>
        
        <p className="text-sm text-gray-500 mb-4">
          All times are in Panama time (GMT-5) • Hours: 8:00 AM - 5:00 PM
        </p>
        
        {/* Time slots legend */}
        <div className="flex flex-wrap items-center space-x-4 mb-5 bg-blue-50 rounded-lg p-2 border border-blue-100 text-xs">
          <h5 className="text-blue-700 font-medium w-full mb-1 pl-1">Time Slot Status:</h5>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-white border border-gray-300 rounded-md shadow-sm mr-1"></div>
            <span className="text-gray-600">Available</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-100 border border-blue-500 rounded-md shadow-sm ring-1 ring-blue-400 mr-1"></div>
            <span className="text-blue-700">Selected</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-50 border border-red-200 rounded-md shadow-inner mr-1"></div>
            <span className="text-red-700">Booked</span>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          This doctor is available on this day. Select a 1-hour time slot below.
        </p>
        
        {isCheckingAvailability ? (
          <div className="flex flex-col items-center justify-center py-10">
            <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">Checking availability for each time slot...</p>
          </div>
        ) : availableTimesForDate.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No available times</h3>
            <p className="mt-1 text-sm text-gray-500">
              All slots for this day have been booked. Please select another date.
            </p>
          </div>
        ) : (
          <div>
            {/* Morning slots */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-1.5 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Morning
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {BUSINESS_HOURS.filter(time => {
                  const [hour] = time.split(':').map(Number);
                  return hour < 12;
                }).map(time => {
                  const timeLabel = formatTimeToString(time);
                  const endTimeLabel = formatTimeToString(`${parseInt(time.split(':')[0])+1}:00`);
                  const isBooked = bookedTimesForDate.includes(time);
                  
                  return (
                    <button
                      key={time}
                      onClick={() => !isBooked && handleTimeSelect(time)}
                      disabled={isBooked}
                      title={isBooked ? 
                        "This time slot is already booked" : 
                        `Book appointment from ${timeLabel} to ${endTimeLabel}`
                      }
                      className={`relative py-3 px-2 text-sm text-center rounded-lg border
                        transition-all duration-200
                        ${isBooked 
                          ? 'bg-red-50 text-red-800 border-red-200 cursor-not-allowed shadow-inner' 
                          : 'hover:bg-blue-50 hover:border-blue-400 hover:shadow text-gray-700 border-gray-300'
                        }
                        ${selectedTime === time 
                          ? 'bg-blue-100 border-blue-500 shadow ring-1 ring-blue-400 font-medium' 
                          : ''
                        }
                      `}
                    >
                      <span className={selectedTime === time ? 'font-medium' : ''}>{timeLabel}</span>
                      <span className="block text-xs text-gray-500">to {endTimeLabel}</span>
                      {isBooked && (
                        <span className="absolute -top-1 -right-1 bg-red-100 text-red-800 text-xs px-1 py-0.5 rounded-full border border-red-200">
                          Booked
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Afternoon slots */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-1.5 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.513 8.199l-3.712-3.713-12.15 12.15a1 1 0 000 1.414l2.3 2.3a1 1 0 001.414 0l12.15-12.15-3.713-3.712a7.991 7.991 0 00-9.9 1.314M3 19l2.213-2.213" />
                </svg>
                Afternoon
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {BUSINESS_HOURS.filter(time => {
                  const [hour] = time.split(':').map(Number);
                  return hour >= 12;
                }).map(time => {
                  const timeLabel = formatTimeToString(time);
                  const endTimeLabel = formatTimeToString(`${parseInt(time.split(':')[0])+1}:00`);
                  const isBooked = bookedTimesForDate.includes(time);
                  
                  return (
                    <button
                      key={time}
                      onClick={() => !isBooked && handleTimeSelect(time)}
                      disabled={isBooked}
                      title={isBooked ? 
                        "This time slot is already booked" : 
                        `Book appointment from ${timeLabel} to ${endTimeLabel}`
                      }
                      className={`relative py-3 px-2 text-sm text-center rounded-lg border
                        transition-all duration-200
                        ${isBooked 
                          ? 'bg-red-50 text-red-800 border-red-200 cursor-not-allowed shadow-inner' 
                          : 'hover:bg-blue-50 hover:border-blue-400 hover:shadow text-gray-700 border-gray-300'
                        }
                        ${selectedTime === time 
                          ? 'bg-blue-100 border-blue-500 shadow ring-1 ring-blue-400 font-medium' 
                          : ''
                        }
                      `}
                    >
                      <span className={selectedTime === time ? 'font-medium' : ''}>{timeLabel}</span>
                      <span className="block text-xs text-gray-500">to {endTimeLabel}</span>
                      {isBooked && (
                        <span className="absolute -top-1 -right-1 bg-red-100 text-red-800 text-xs px-1 py-0.5 rounded-full border border-red-200">
                          Booked
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Mobile scrolling time selector - visible only on small screens */}
            <div className="mt-6 sm:hidden">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-1.5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
                Quick Select (scroll horizontally)
              </h4>
              <div className="rounded-md border border-blue-100 overflow-hidden">
                <div className="overflow-x-auto bg-blue-50/50 px-2 py-3">
                  <div className="flex space-x-2 w-max px-1">
                    {BUSINESS_HOURS.map(time => {
                      const timeLabel = formatTimeToString(time);
                      const endTimeLabel = formatTimeToString(`${parseInt(time.split(':')[0])+1}:00`);
                      const [hours] = time.split(':').map(Number);
                      const isMorning = hours < 12;
                      const isBooked = bookedTimesForDate.includes(time);
                      
                      return (
                        <button
                          key={`mobile-${time}`}
                          onClick={() => !isBooked && handleTimeSelect(time)}
                          disabled={isBooked}
                          title={isBooked ? 
                            "This time slot is already booked" : 
                            `Book from ${timeLabel} to ${endTimeLabel}`
                          }
                          className={`relative flex-shrink-0 py-3 px-4 text-center rounded-lg border shadow-sm
                            ${isBooked 
                              ? 'bg-red-50 text-red-800 border-red-200 cursor-not-allowed shadow-inner' 
                              : `hover:shadow text-gray-700 border-gray-300 ${isMorning ? 'bg-amber-50/50' : 'bg-blue-50/50'}`
                            }
                            ${selectedTime === time 
                              ? 'bg-blue-100 border-blue-500 ring-1 ring-blue-500 shadow-md' 
                              : ''
                            }
                          `}
                        >
                          <div className={`text-sm ${selectedTime === time ? 'font-medium' : ''}`}>{timeLabel}</div>
                          <div className="text-xs mt-1">
                            {isMorning 
                              ? <span className="text-amber-700">Morning</span> 
                              : <span className="text-blue-700">Afternoon</span>
                            }
                          </div>
                          <div className="text-xs mt-1 text-gray-500">to {endTimeLabel}</div>
                          {isBooked && (
                            <div className="absolute -top-1.5 -right-1.5 bg-red-100 text-red-800 text-xs font-bold px-1.5 py-0.5 rounded-md border border-red-200 shadow-sm">
                              Booked
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Continue button - only shown when a time is selected */}
            {selectedTime && (
              <div className="mt-6">
                <button
                  onClick={() => setCurrentStep('form')}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Continue to booking details
                </button>
              </div>
            )}
          </div>
        )}
      </>
    );
  };
  
  // Render booking form
  const renderBookingForm = () => {
    if (!selectedDate || !selectedTime) return null;
    
    const dateTimeStr = createDateTimeString(selectedDate, selectedTime);
    const dateTime = parseISO(dateTimeStr);
    
    return (
      <>
        <div className="mb-4">
          <button 
            onClick={handleBack}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to time selection
          </button>
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-4">Complete your booking</h3>
        
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">Appointment with Dr. {doctor.name}</h4>
              <p className="mt-1 text-sm text-blue-700">{format(dateTime, 'EEEE, MMMM d, yyyy')}</p>
              <p className="mt-1 text-sm text-blue-700">{format(dateTime, 'h:mm a')} (Panama time)</p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                />
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
              />
            </div>
            
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                Reason for Visit
              </label>
              <textarea
                id="reason"
                name="reason"
                rows={3}
                value={formData.reason}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
              />
            </div>
          </div>
          
          <div className="mt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : 'Book Appointment'}
            </button>
          </div>
        </form>
      </>
    );
  };
  
  // Render success message
  const renderSuccessMessage = () => {
    if (!selectedDate || !selectedTime) return null;
    
    const dateTimeStr = createDateTimeString(selectedDate, selectedTime);
    const dateTime = parseISO(dateTimeStr);
    
    return (
      <div className="text-center py-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">Appointment Confirmed!</h3>
        <p className="mt-2 text-sm text-gray-500">
          Your appointment with Dr. {doctor.name} on {format(dateTime, 'MMMM d')} at {format(dateTime, 'h:mm a')} has been booked.
        </p>
        <p className="mt-1 text-sm text-gray-500">
          A confirmation email has been sent to {formData.email}.
        </p>
        <div className="mt-6 space-x-3">
          <button
            onClick={() => {
              handleClose();
              navigate('/appointments');
            }}
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View My Appointments
          </button>
          <button
            onClick={handleClose}
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - positioned below the modal content */}
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-40" 
        onClick={handleClose}
        aria-hidden="true"
      />
      
      {/* Modal container - higher z-index than backdrop */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* Modal panel - will not bubble clicks to backdrop */}
          <div 
            className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header with gradient background */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 border-b border-blue-400 flex items-center justify-between">
              <h2 className="text-lg font-medium text-white">
                Book Appointment with Dr. {doctor.name}
              </h2>
              <button
                type="button"
                className="text-white/80 hover:text-white focus:outline-none transition-colors"
                onClick={handleClose}
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal content with subtle pattern background */}
            <div className="p-6 bg-gradient-to-b from-gray-50 to-white">
              {currentStep === 'calendar' && renderCalendar()}
              {currentStep === 'time' && renderTimeSelection()}
              {currentStep === 'form' && renderBookingForm()}
              {currentStep === 'success' && renderSuccessMessage()}
            </div>
          </div>
        </div>
      </div>
      
      {/* Notification that appears after booking */}
      <AppointmentNotification
        show={showNotification}
        doctorName={doctor.name}
        appointmentDate={appointmentDateTime}
        onClose={() => setShowNotification(false)}
      />
    </>
  );
};

export default BookingModal; 