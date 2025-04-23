import React from 'react';
import DoctorDirectory from '../components/DoctorDirectory';
import { useSeo } from '../services/useSeo';
import { seoConfigs } from '../services/seo';

const Doctors: React.FC = () => {
  // Apply SEO metadata for the doctors page
  useSeo(seoConfigs.doctors());
  
  return (
    <div className="container mx-auto p-4">
      <DoctorDirectory />
    </div>
  );
};

export default Doctors;
