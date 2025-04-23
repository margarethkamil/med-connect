import React, { useState, useMemo } from 'react';
import { Doctor } from '../types/doctor';
import BookingModal from './BookingModal';
import { useDoctorStore } from '../store/doctorStore';
import { differenceInDays } from 'date-fns';
import ReactDOM from 'react-dom';
import { toZonedTime, format as formatTz } from 'date-fns-tz';

// Icons
const LocationIcon = () => (
  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

interface DoctorCardProps {
  doctor: Doctor;
}

const PANAMA_TZ = 'America/Panama';

const DoctorCard: React.FC<DoctorCardProps> = ({ doctor }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDoctorInfo, setShowDoctorInfo] = useState(false);
  const doctorsWithAvailability = useDoctorStore(state => state.doctorsWithAvailability);
  
  // Get availability information for this doctor
  const availabilityInfo = useMemo(() => {
    // First check if availability is already in the doctor object
    const directAvailability = doctor.availability || [];
    
    // Then fallback to the store data if needed
    const availabilities = directAvailability.length > 0 
      ? directAvailability
      : doctorsWithAvailability[doctor.id] || [];
    
    if (availabilities.length === 0) return { nextSlot: null, isToday: false, daysUntil: null };
    
    // Sort availabilities by date (ascending)
    const sortedAvailabilities = [...availabilities].sort();
    
    // Find the first availability after now
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextSlot = sortedAvailabilities.find(slot => {
      const dateTime = new Date(slot);
      return dateTime > now;
    });
    
    if (!nextSlot) return { nextSlot: null, isToday: false, daysUntil: null };
    
    // Get additional information about the next slot
    const nextDateTime = new Date(nextSlot);
    const slotDate = new Date(nextDateTime);
    slotDate.setHours(0, 0, 0, 0);
    
    const isToday = slotDate.getTime() === today.getTime();
    const daysUntil = differenceInDays(slotDate, today);
    
    // Format the nextSlot in Panama time, but always show 8:00 AM
    const panamaDate = toZonedTime(nextDateTime, PANAMA_TZ);
    panamaDate.setHours(8, 0, 0, 0); // Always set to 8:00 AM
    return {
      nextSlot: formatTz(panamaDate, 'MMM d, h:mm a'),
      isToday,
      daysUntil
    };
  }, [doctor.id, doctor.availability, doctorsWithAvailability]);

  // Function to generate the availability badge text
  const getAvailabilityBadge = () => {
    if (!availabilityInfo.nextSlot) return null;
    
    if (availabilityInfo.isToday) {
      return { text: 'Available Today', color: 'bg-green-500' };
    } else if (availabilityInfo.daysUntil === 1) {
      return { text: 'Available Tomorrow', color: 'bg-emerald-500' };
    } else if (availabilityInfo.daysUntil && availabilityInfo.daysUntil <= 3) {
      return { text: 'Available Soon', color: 'bg-teal-500' };
    } else {
      return { text: 'Available', color: 'bg-blue-500' };
    }
  };
  
  const availabilityBadge = getAvailabilityBadge();
  
  const openModal = (e: React.MouseEvent) => {
    // Stop event propagation
    e.preventDefault();
    e.stopPropagation();
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
  };

  const openDoctorInfo = (e: React.MouseEvent) => {
    // Stop event propagation
    e.preventDefault();
    e.stopPropagation();
    setShowDoctorInfo(true);
  };
  
  const closeDoctorInfo = () => {
    setShowDoctorInfo(false);
  };

  // Create a modal portal to render the modal outside the card
  const renderModal = () => {
    if (!isModalOpen) return null;
    
    // Find modal root or create it if it doesn't exist
    let modalRoot = document.getElementById('modal-root');
    if (!modalRoot) {
      modalRoot = document.createElement('div');
      modalRoot.id = 'modal-root';
      document.body.appendChild(modalRoot);
    }
    
    return ReactDOM.createPortal(
      <BookingModal 
        doctor={doctor} 
        isOpen={isModalOpen} 
        onClose={closeModal} 
      />,
      modalRoot
    );
  };

  // Render doctor info modal
  const renderDoctorInfoModal = () => {
    if (!showDoctorInfo) return null;
    
    // Find modal root or create it if it doesn't exist
    let modalRoot = document.getElementById('modal-root');
    if (!modalRoot) {
      modalRoot = document.createElement('div');
      modalRoot.id = 'modal-root';
      document.body.appendChild(modalRoot);
    }
    
    return ReactDOM.createPortal(
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 transition-opacity z-40" 
          onClick={closeDoctorInfo}
          aria-hidden="true"
        />
        
        {/* Modal container */}
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div 
              className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-medium text-white">Doctor Profile</h2>
                <button
                  type="button"
                  className="text-white/80 hover:text-white focus:outline-none transition-colors"
                  onClick={closeDoctorInfo}
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Doctor details */}
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  {doctor.photo ? (
                    <img 
                      src={doctor.photo} 
                      alt={doctor.name} 
                      className="h-20 w-20 object-cover rounded-full border-2 border-blue-100"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-medium">
                      {doctor.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{doctor.name}</h3>
                    <p className="text-gray-600">{doctor.specialty}</p>
                    {doctor.location && (
                      <p className="text-sm text-gray-500 flex items-center mt-1">
                        <LocationIcon />
                        <span className="ml-1">{doctor.location}</span>
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Rating */}
                {typeof doctor.rating !== 'undefined' && (
                  <div className="flex items-center mb-4 bg-gray-50 p-3 rounded-lg">
                    <div className="flex mr-2">
                      {[...Array(5)].map((_, i) => (
                        <svg 
                          key={i} 
                          className={`w-5 h-5 ${i < Math.round(doctor.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-gray-700">
                      {doctor.rating?.toFixed(1) || '0.0'} ({doctor.reviewCount || 0} reviews)
                    </p>
                  </div>
                )}
                
                {/* Bio */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-2 text-gray-800">About</h4>
                  <p className="text-gray-600">{doctor.bio}</p>
                </div>
                
                {/* Availability */}
                {availabilityInfo.nextSlot && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold mb-2 text-gray-800">Availability</h4>
                    <div className="flex items-center text-green-700 bg-green-50 px-4 py-3 rounded-lg">
                      <CalendarIcon />
                      <span className="ml-2">Next available: {availabilityInfo.nextSlot}</span>
                    </div>
                  </div>
                )}
                
                {/* Book button */}
                <div className="mt-8">
                  <button
                    onClick={(e) => {
                      closeDoctorInfo();
                      openModal(e);
                    }}
                    className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Book 
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>,
      modalRoot
    );
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
        <div className="relative">
          {/* Doctor Image */}
          <div className="h-48 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-center overflow-hidden">
            {doctor.photo ? (
              <img 
                src={doctor.photo} 
                alt={doctor.name} 
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-4xl font-medium">
                {doctor.name.charAt(0)}
              </div>
            )}
          </div>
          
          {/* Availability Badge */}
          {availabilityBadge && (
            <div className={`absolute top-4 right-4 ${availabilityBadge.color} text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-md`}>
              {availabilityBadge.text}
            </div>
          )}
          
          {/* Specialty Tag */}
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-white/90 backdrop-blur-sm text-blue-800 rounded-full shadow-sm">
              {doctor.specialty}
            </span>
          </div>
        </div>
        
        <div className="p-5">
          {/* Doctor Info */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-1.5">{doctor.name}</h2>
            
            {/* Ratings */}
            {typeof doctor.rating !== 'undefined' && (
              <div className="flex items-center">
                <div className="flex mr-2">
                  {[...Array(5)].map((_, i) => (
                    <svg 
                      key={i} 
                      className={`w-4 h-4 ${i < Math.round(doctor.rating || 0) ? 'text-yellow-400' : 'text-gray-200'}`}
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{doctor.rating?.toFixed(1) || '0.0'}</span> ({doctor.reviewCount || 0} reviews)
                </p>
              </div>
            )}
          </div>
          
          {/* Info Row */}
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Location */}
            {doctor.location && (
              <div className="inline-flex items-center text-xs font-medium text-gray-700 bg-gray-50 px-2.5 py-1 rounded-full">
                <LocationIcon />
                <span className="ml-1">{doctor.location}</span>
              </div>
            )}
            
            {/* Next Available Time */}
            {availabilityInfo.nextSlot && (
              <div className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                <CalendarIcon />
                <span className="ml-1">{availabilityInfo.nextSlot}</span>
              </div>
            )}
          </div>
          
          {/* Bio - truncated */}
          <p className="text-sm text-gray-600 line-clamp-2 mb-5 h-10 flex items-start">{doctor.bio || "Specialist with expertise in providing quality healthcare."}</p>
          
          {/* Action Buttons */}
          <div className="flex gap-2 mt-6">
            {/* Book Button */}
            <button
              onClick={openModal}
              className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Book Appointment
            </button>
            
            {/* View Profile Button */}
            <button
              onClick={openDoctorInfo}
              className="py-2.5 px-3.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center"
              aria-label="View doctor profile"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Render modals using portal */}
      {renderModal()}
      {renderDoctorInfoModal()}
    </>
  );
};

export default DoctorCard; 