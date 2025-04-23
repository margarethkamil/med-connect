import React, { useEffect } from 'react';
import { useDoctorStore } from '../store/doctorStore';
import DoctorCard from '../components/DoctorCard';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  const { doctors, loading, error, fetchDoctors } = useDoctorStore();

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  return (
    <div className="container mx-auto p-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-4">Find and Book Your Doctor</h1>
        <p className="text-xl text-gray-600">
          Book appointments with the best doctors in your area
        </p>
      </div>

      {loading ? (
        <p className="text-center text-gray-600">Loading doctors...</p>
      ) : error ? (
        <div className="bg-red-100 text-red-800 p-4 rounded-md">
          <p>Error: {error}</p>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Featured Doctors</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.slice(0, 3).map((doctor) => (
                <DoctorCard key={doctor.id} doctor={doctor} />
              ))}
            </div>
          </div>
          
          <div className="text-center mt-8">
            <Link 
              to="/doctors" 
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              View All Doctors
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default Home;
