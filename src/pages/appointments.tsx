import React from 'react';
import AppointmentList from '../components/AppointmentList';
import { useSeo } from '../services/useSeo';
import { seoConfigs } from '../services/seo';

const Appointments: React.FC = () => {
  // Apply SEO metadata for the appointments page
  useSeo(seoConfigs.appointments());
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-6xl mx-auto p-4 py-6">
        <div className="relative mb-8 overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 shadow-md">
          <div className="relative z-10">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">My Appointments</h1>
            <p className="mt-2 text-blue-100 max-w-2xl">
              Manage your scheduled consultations and medical appointments
            </p>
          </div>
          {/* Decorative pattern */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-10">
            <svg width="300" height="300" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <path fill="#FFFFFF" d="M37.7,-50.1C49.9,-45.2,61.8,-36.4,65.8,-24.5C69.8,-12.7,65.8,2.1,60.3,15.2C54.8,28.3,47.7,39.7,37.2,47.9C26.8,56.1,13.4,61.1,0.6,60.2C-12.2,59.4,-24.5,52.7,-35.5,44.2C-46.5,35.8,-56.2,25.6,-61.2,12.6C-66.3,-0.4,-66.6,-16.3,-60.4,-27.8C-54.2,-39.4,-41.4,-46.6,-28.9,-51.4C-16.4,-56.2,-4.1,-58.5,7.3,-57.8C18.7,-57.1,25.5,-55,37.7,-50.1Z" transform="translate(100 100)" />
            </svg>
          </div>
        </div>
        <AppointmentList />
      </div>
    </div>
  );
};

export default Appointments;
