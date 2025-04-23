import React from 'react';
import AppointmentList from '../components/AppointmentList';
import { useSeo } from '../services/useSeo';
import { seoConfigs } from '../services/seo';

const Appointments: React.FC = () => {
  // Apply SEO metadata for the appointments page
  useSeo(seoConfigs.appointments());
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">My Appointments</h1>
      <AppointmentList />
    </div>
  );
};

export default Appointments;
