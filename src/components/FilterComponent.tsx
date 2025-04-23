import React, { useState, useEffect, useCallback } from 'react';
import { useDoctorStore, AvailabilityFilter } from '../store/doctorStore';

const FilterComponent: React.FC = () => {
  // Get store values and functions
  const getSpecialties = useDoctorStore(state => state.getSpecialties);
  const specialties = getSpecialties();
  const selectedSpecialties = useDoctorStore(state => state.selectedSpecialties);
  const selectedAvailability = useDoctorStore(state => state.selectedAvailability);
  const filterBySpecialty = useDoctorStore(state => state.filterBySpecialty);
  const filterByAvailability = useDoctorStore(state => state.filterByAvailability);
  const resetFilters = useDoctorStore(state => state.resetFilters);

  const [specialtiesOpen, setSpecialtiesOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.specialty-dropdown') && !target.closest('.specialty-button')) {
        setSpecialtiesOpen(false);
      }
      if (!target.closest('.availability-dropdown') && !target.closest('.availability-button')) {
        setAvailabilityOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Toggle specialty selection
  const toggleSpecialty = useCallback((specialty: string) => {
    const newSpecialties = selectedSpecialties.includes(specialty)
      ? selectedSpecialties.filter((s) => s !== specialty)
      : [...selectedSpecialties, specialty];
    
    filterBySpecialty(newSpecialties);
  }, [selectedSpecialties, filterBySpecialty]);

  // Handle availability selection
  const handleAvailabilityChange = useCallback((availability: string) => {
    filterByAvailability(availability as AvailabilityFilter);
    setAvailabilityOpen(false);
  }, [filterByAvailability]);

  return (
    <div className="py-4 px-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <h2 className="text-lg font-medium text-gray-800 mb-3 md:mb-0">Filter Doctors</h2>
        
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
          {/* Specialty Filter */}
          <div className="relative specialty-dropdown">
            <button
              className="specialty-button w-full sm:w-auto bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-between"
              onClick={() => setSpecialtiesOpen(!specialtiesOpen)}
            >
              <span>Specialty</span>
              <span className="ml-2 bg-blue-100 text-blue-800 py-0.5 px-2 rounded-full text-xs">
                {selectedSpecialties.length || 'Any'}
              </span>
              <svg
                className={`ml-2 h-5 w-5 text-gray-400 transition-transform ${
                  specialtiesOpen ? 'transform rotate-180' : ''
                }`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            
            {specialtiesOpen && (
              <div className="absolute z-10 mt-2 w-64 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="p-2">
                  <div className="p-2 border-b border-gray-100">
                    <h3 className="text-sm font-medium text-gray-900">Select specialties</h3>
                  </div>
                  <div className="mt-2 max-h-60 overflow-y-auto">
                    {specialties.map((specialty) => (
                      <div
                        key={specialty}
                        className="flex items-center px-3 py-2 hover:bg-gray-50 rounded-md cursor-pointer"
                        onClick={() => toggleSpecialty(specialty)}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          checked={selectedSpecialties.includes(specialty)}
                          onChange={() => {}}
                        />
                        <label className="ml-3 text-sm text-gray-700 cursor-pointer w-full">
                          {specialty}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Availability Filter */}
          <div className="relative availability-dropdown">
            <button
              className="availability-button w-full sm:w-auto bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-between"
              onClick={() => setAvailabilityOpen(!availabilityOpen)}
            >
              <span>Availability</span>
              <span className="ml-2 bg-green-100 text-green-800 py-0.5 px-2 rounded-full text-xs">
                {selectedAvailability === 'any'
                  ? 'Any'
                  : selectedAvailability === 'today'
                  ? 'Today'
                  : selectedAvailability === 'this-week'
                  ? 'This Week'
                  : 'Next Available'}
              </span>
              <svg
                className={`ml-2 h-5 w-5 text-gray-400 transition-transform ${
                  availabilityOpen ? 'transform rotate-180' : ''
                }`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            
            {availabilityOpen && (
              <div className="absolute z-10 mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="p-2">
                  <div className="p-2 border-b border-gray-100">
                    <h3 className="text-sm font-medium text-gray-900">Select availability</h3>
                  </div>
                  <div className="mt-1">
                    {[
                      { id: 'any', label: 'Any' },
                      { id: 'today', label: 'Available Today' },
                      { id: 'this-week', label: 'Available This Week' },
                      { id: 'next-available', label: 'Next Available' },
                    ].map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center px-3 py-2 hover:bg-gray-50 rounded-md cursor-pointer"
                        onClick={() => handleAvailabilityChange(option.id)}
                      >
                        <input
                          type="radio"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          checked={selectedAvailability === option.id}
                          onChange={() => {}}
                        />
                        <label className="ml-3 text-sm text-gray-700 cursor-pointer w-full">
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reset Filters */}
          {(selectedSpecialties.length > 0 || selectedAvailability !== 'any') && (
            <button
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
              onClick={resetFilters}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Reset filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterComponent; 