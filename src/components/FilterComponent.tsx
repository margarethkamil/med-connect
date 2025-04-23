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
  
  // For mobile view, track if filters are expanded
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  // Track which filter section is open in dropdown
  const [openFilterDropdown, setOpenFilterDropdown] = useState<string | null>(null);
  
  // Track selected specialties locally for multi-select
  const [localSelectedSpecialties, setLocalSelectedSpecialties] = useState<string[]>(selectedSpecialties);
  
  // Update local state when store state changes, but with a ref to prevent infinite loops
  useEffect(() => {
    // Only update if they're actually different (prevents circular updates)
    if (JSON.stringify(localSelectedSpecialties) !== JSON.stringify(selectedSpecialties)) {
      setLocalSelectedSpecialties(selectedSpecialties);
    }
  }, [selectedSpecialties]);
  
  // Handle specialty toggle - memoized to prevent recreating on each render
  const handleSpecialtyToggle = useCallback((specialty: string) => {
    setLocalSelectedSpecialties(prev => {
      let newSelection: string[];
      
      if (prev.includes(specialty)) {
        // Remove if already selected
        newSelection = prev.filter(s => s !== specialty);
      } else {
        // Add if not selected
        newSelection = [...prev, specialty];
      }
      
      // Call store update ONLY if the selection has changed
      if (JSON.stringify(newSelection) !== JSON.stringify(selectedSpecialties)) {
        filterBySpecialty(newSelection);
      }
      
      return newSelection;
    });
  }, [filterBySpecialty, selectedSpecialties]);
  
  // Handle availability change
  const handleAvailabilityChange = useCallback((availability: AvailabilityFilter) => {
    filterByAvailability(availability);
  }, [filterByAvailability]);
  
  // Handle reset filters
  const handleResetFilters = useCallback(() => {
    resetFilters();
    setLocalSelectedSpecialties([]);
  }, [resetFilters]);
  
  // Toggle dropdown menu
  const toggleDropdown = useCallback((dropdown: string) => {
    setOpenFilterDropdown(prev => prev === dropdown ? null : dropdown);
  }, []);
  
  // For mobile view
  const toggleFilters = useCallback(() => {
    setFiltersExpanded(prev => !prev);
  }, []);
  
  return (
    <div className="px-4 py-3">
      {/* Desktop Filter Layout */}
      <div className="hidden md:block">
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Specialty Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('specialty')}
                className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none flex items-center"
              >
                <span className="mr-1 font-medium">Specialty</span>
                {selectedSpecialties.length > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold ml-1.5 px-2 py-0.5 rounded-full">
                    {selectedSpecialties.length}
                  </span>
                )}
                <svg className="ml-2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {openFilterDropdown === 'specialty' && (
                <div className="absolute left-0 mt-2 w-60 bg-white border border-gray-300 rounded-md shadow-lg z-10">
                  <div className="p-3 max-h-60 overflow-y-auto">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-medium text-gray-700">Select Specialties</h3>
                      {selectedSpecialties.length > 0 && (
                        <button
                          onClick={() => filterBySpecialty([])}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {specialties.map(specialty => (
                        <div key={specialty} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`specialty-dropdown-${specialty}`}
                            checked={localSelectedSpecialties.includes(specialty)}
                            onChange={() => handleSpecialtyToggle(specialty)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label
                            htmlFor={`specialty-dropdown-${specialty}`}
                            className="ml-2 block text-sm text-gray-700"
                          >
                            {specialty}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Availability Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('availability')}
                className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none flex items-center"
              >
                <span className="mr-1 font-medium">Availability</span>
                {selectedAvailability !== 'any' && (
                  <span className="bg-green-100 text-green-800 text-xs font-semibold ml-1.5 px-2 py-0.5 rounded-full">1</span>
                )}
                <svg className="ml-2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {openFilterDropdown === 'availability' && (
                <div className="absolute left-0 mt-2 w-52 bg-white border border-gray-300 rounded-md shadow-lg z-10">
                  <div className="p-3">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-medium text-gray-700">Availability</h3>
                      {selectedAvailability !== 'any' && (
                        <button
                          onClick={() => handleAvailabilityChange('any')}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {[
                        { value: 'any', label: 'Any Time' },
                        { value: 'today', label: 'Available Today' },
                        { value: 'this-week', label: 'Available This Week' },
                        { value: 'next-available', label: 'Next Available' }
                      ].map(option => (
                        <div key={option.value} className="flex items-center">
                          <input
                            type="radio"
                            id={`availability-dropdown-${option.value}`}
                            name="availability-dropdown"
                            checked={selectedAvailability === option.value}
                            onChange={() => handleAvailabilityChange(option.value as AvailabilityFilter)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <label
                            htmlFor={`availability-dropdown-${option.value}`}
                            className="ml-2 block text-sm text-gray-700"
                          >
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Reset Filters Button */}
          {(selectedSpecialties.length > 0 || selectedAvailability !== 'any') && (
            <button
              onClick={handleResetFilters}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear All Filters
            </button>
          )}
        </div>
      </div>
      
      {/* Mobile Filter Toggle Button */}
      <div className="md:hidden">
        <button
          onClick={toggleFilters}
          className="flex items-center justify-between w-full px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm"
        >
          <span className="font-medium text-gray-700">Filters</span>
          <svg 
            className={`w-5 h-5 text-gray-500 transition-transform ${filtersExpanded ? 'transform rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {/* Mobile Expanded Filter Section */}
        {filtersExpanded && (
          <div className="mt-4 bg-white rounded-lg shadow p-4">
            {/* Specialty Filter Section */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Specialty</h3>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {specialties.map(specialty => (
                  <div key={specialty} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`specialty-mobile-${specialty}`}
                      checked={localSelectedSpecialties.includes(specialty)}
                      onChange={() => handleSpecialtyToggle(specialty)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor={`specialty-mobile-${specialty}`}
                      className="ml-2 block text-sm text-gray-700"
                    >
                      {specialty}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Availability Filter Section */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Availability</h3>
              <div className="space-y-2">
                {[
                  { value: 'any', label: 'Any Time' },
                  { value: 'today', label: 'Available Today' },
                  { value: 'this-week', label: 'Available This Week' },
                  { value: 'next-available', label: 'Next Available' }
                ].map(option => (
                  <div key={option.value} className="flex items-center">
                    <input
                      type="radio"
                      id={`availability-mobile-${option.value}`}
                      name="availability-mobile"
                      checked={selectedAvailability === option.value}
                      onChange={() => handleAvailabilityChange(option.value as AvailabilityFilter)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label
                      htmlFor={`availability-mobile-${option.value}`}
                      className="ml-2 block text-sm text-gray-700"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Mobile Reset Button */}
            {(selectedSpecialties.length > 0 || selectedAvailability !== 'any') && (
              <button
                onClick={handleResetFilters}
                className="w-full mt-3 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded-md"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterComponent; 