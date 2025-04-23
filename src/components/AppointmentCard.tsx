import React, { useState, useCallback } from 'react';
import { Appointment } from '../types/appointment';
import { useAppointmentStore } from '../store/appointmentStore';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { setMinutes, setHours } from 'date-fns';

// Panama time zone (GMT-5)
const TIME_ZONE = 'America/Panama';

// Helper function to format dates safely
const formatDate = (dateString: string): string => {
  try {
    // Parse the ISO date string to UTC, then convert to Panama time
    const date = toZonedTime(new Date(dateString), TIME_ZONE);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    // Format the date in Panama time
    return format(date, 'EEEE, MMMM d, yyyy');
  } catch (error) {
    // If there's an error, return the original string
    //console.error('Error formatting date:', error);
    return dateString;
  }
};

interface AppointmentCardProps {
  appointment: Appointment;
}

// Format date and time from appointment
const getFormattedDateTime = (appointment: Appointment) => {
  try {
    // Since we now have separate date and time fields
    if (appointment.date && appointment.time) {
      const formattedDate = formatDate(appointment.date);
      
      const formattedTime = format(
        toZonedTime(
          setMinutes(
            setHours(new Date(), parseInt(appointment.time.split(':')[0], 10)),
            parseInt(appointment.time.split(':')[1], 10)
          ),
          TIME_ZONE
        ),
        'h:mm a'
      );
      
      return { formattedDate, formattedTime };
    }
    
    // Fallback
    return { formattedDate: 'No date', formattedTime: 'No time' };
  } catch (error) {
    //console.error('Error formatting date/time:', error);
    return { formattedDate: 'Error', formattedTime: 'Error' };
  }
};

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment }) => {
  const cancelUserAppointment = useAppointmentStore(state => state?.cancelUserAppointment);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = useCallback(async () => {
    if (!appointment?.id || appointment.status === 'cancelled' || !cancelUserAppointment) return;
    
    setIsLoading(true);
    setError(null);
    try {
      await cancelUserAppointment(appointment.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel appointment');
    } finally {
      setIsLoading(false);
    }
  }, [appointment?.id, appointment?.status, cancelUserAppointment]);

  // Get formatted date and time
  const { formattedDate, formattedTime } = getFormattedDateTime(appointment);

  const getStatusBadgeClasses = () => {
    switch (appointment?.status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border border-blue-200';
    }
  };

  const getStatusIcon = () => {
    switch (appointment?.status) {
      case 'confirmed':
        return (
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'cancelled':
        return (
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'pending':
        return (
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (!appointment) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 appointment-card animate-fadeIn">
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              {appointment.patientName}
            </h3>
            <div className="mt-2 flex items-center text-gray-500">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm">
                {formattedDate}
              </span>
            </div>
            <div className="mt-1 flex items-center text-gray-500">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">
                {formattedTime}
              </span>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium shadow-sm flex items-center ${getStatusBadgeClasses()}`}>
            {getStatusIcon()}
            {appointment.status ? (appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)) : 'Unknown'}
          </span>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-lg text-sm border border-red-200 flex items-start">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {appointment.status === 'confirmed' && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className={`w-full py-2.5 text-sm font-medium rounded-lg flex items-center justify-center transition-all ${
                isLoading 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Cancelling...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel Appointment
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentCard; 