import React, { useEffect } from 'react';
import FilterComponent from './FilterComponent';
import DoctorCard from './DoctorCard';
import { useDoctorStore } from '../store/doctorStore';

const DoctorDirectory: React.FC = () => {
  const doctors = useDoctorStore(state => state.filteredDoctors);
  const loading = useDoctorStore(state => state.loading);
  const error = useDoctorStore(state => state.error);
  const selectedSpecialties = useDoctorStore(state => state.selectedSpecialties);
  const selectedAvailability = useDoctorStore(state => state.selectedAvailability);
  const fetchDoctors = useDoctorStore(state => state.fetchDoctors);
  const hasActiveFilters = selectedSpecialties.length > 0 || selectedAvailability !== 'any';

  // Fetch doctors on component mount
  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Find a Doctor</h1>
        <p className="mt-2 text-gray-600">
          Search for doctors by specialty and availability
        </p>
      </div>

      {/* Main Content with Filters and Results */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Filter Section */}
        <div className="border-b border-gray-200">
          <FilterComponent />
        </div>

        {/* Active Filters Summary - only show when filters are active */}
        {hasActiveFilters && (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500">Active filters:</span>
              
              {selectedSpecialties.map(specialty => (
                <span 
                  key={specialty}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {specialty}
                </span>
              ))}
              
              {selectedAvailability !== 'any' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {selectedAvailability === 'today' && 'Available Today'}
                  {selectedAvailability === 'this-week' && 'Available This Week'}
                  {selectedAvailability === 'next-available' && 'Next Available'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Doctor Results */}
        <div className="p-4">
          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <p>Error: {error}</p>
            </div>
          )}
          
          {/* Empty Results */}
          {!loading && !error && doctors.length === 0 && (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No doctors found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try changing your search filters or check back later.
              </p>
            </div>
          )}

          {/* Doctor Grid */}
          {!loading && !error && doctors.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map(doctor => (
                <DoctorCard key={doctor.id} doctor={doctor} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorDirectory; 