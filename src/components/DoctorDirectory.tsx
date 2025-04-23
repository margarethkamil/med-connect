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
    <div>
      {/* Main Content with Filters and Results */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        {/* Filter Section with slightly different background */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <FilterComponent />
        </div>

        {/* Active Filters Summary - only show when filters are active */}
        {hasActiveFilters && (
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-blue-700 font-medium">Active filters:</span>
              
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
        <div className="p-6">
          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-16">
              <div className="relative w-16 h-16">
                <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-gray-200"></div>
                <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-t-blue-600 animate-spin"></div>
              </div>
              <p className="ml-4 text-gray-600 font-medium">Loading doctors...</p>
            </div>
          )}
          
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-lg">
              <p className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            </div>
          )}
          
          {/* Empty Results */}
          {!loading && !error && doctors.length === 0 && (
            <div className="text-center py-16 max-w-md mx-auto">
              <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="h-12 w-12 text-gray-400"
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
              </div>
              <h3 className="text-lg font-medium text-gray-900">No doctors found</h3>
              <p className="mt-2 text-base text-gray-500">
                Try adjusting your search filters or check back later for more options.
              </p>
            </div>
          )}

          {/* Doctor Grid with proper spacing */}
          {!loading && !error && doctors.length > 0 && (
            <>
              <div className="flex justify-between items-center mb-6">
                <p className="text-gray-700">
                  <span className="font-medium text-gray-900">{doctors.length}</span> doctor{doctors.length !== 1 ? 's' : ''} matching your criteria
                </p>
                
                {hasActiveFilters && (
                  <p className="text-sm text-gray-500">
                    Showing filtered results
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
                {doctors.map(doctor => (
                  <DoctorCard key={doctor.id} doctor={doctor} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorDirectory; 