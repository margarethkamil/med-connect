import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface AppointmentNotificationProps {
  show: boolean;
  doctorName: string;
  appointmentDate: string;
  onClose: () => void;
}

const AppointmentNotification: React.FC<AppointmentNotificationProps> = ({
  show,
  doctorName,
  appointmentDate,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (show) {
      setIsVisible(true);
      
      // Auto-hide after 7 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose();
      }, 7000);
      
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed bottom-4 right-4 max-w-md w-full bg-white rounded-lg shadow-lg z-50 overflow-hidden">
      <div className="p-4 flex items-start">
        <div className="flex-shrink-0 pt-0.5">
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <div className="ml-3 w-0 flex-1">
          <h3 className="text-sm font-medium text-gray-900">Appointment Booked!</h3>
          <p className="mt-1 text-sm text-gray-500">
            Your appointment with Dr. {doctorName} on {appointmentDate} has been confirmed.
          </p>
          <div className="mt-2 flex space-x-3">
            <Link
              to="/appointments"
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View My Appointments
            </Link>
            <button
              type="button"
              onClick={() => {
                setIsVisible(false);
                onClose();
              }}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Dismiss
            </button>
          </div>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
            onClick={() => {
              setIsVisible(false);
              onClose();
            }}
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      <div className="h-1 bg-blue-600 animate-[shrink_7s_ease-in-out]"></div>
    </div>
  );
};

export default AppointmentNotification; 