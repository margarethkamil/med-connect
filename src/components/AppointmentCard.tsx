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
    console.error('Error formatting date:', error);
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
    console.error('Error formatting date/time:', error);
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

  // Debug appointment data
  console.log('Rendering appointment:', appointment);

  const getStatusBadgeClasses = () => {
    switch (appointment?.status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (!appointment) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              {appointment.patientName}
            </h3>
            <div className="mt-2">
              <span className="text-gray-600 text-sm">
                {formattedDate} at {formattedTime}
              </span>
            </div>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClasses()}`}>
            {appointment.status ? (appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)) : 'Unknown'}
          </span>
        </div>

        {error && (
          <div className="mt-4 p-2 bg-red-100 text-red-800 rounded-md text-sm">
            {error}
          </div>
        )}

        {appointment.status === 'confirmed' && (
          <div className="mt-4">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className={`w-full py-2 text-sm font-medium rounded-md border border-red-300 text-red-600 hover:bg-red-50 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Cancelling...' : 'Cancel Appointment'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentCard; 