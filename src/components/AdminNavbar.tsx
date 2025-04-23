import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const AdminNavbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  // Helper to determine if a link is active
  const isActive = (path: string) => {
    return location.pathname.includes(path);
  };
  
  // Don't render navigation links on desktop as they're already in the header
  // Only render the mobile menu button on small screens
  return (
    <div className="ml-auto">
      {/* Mobile menu button only */}
      <div className="md:hidden">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-gray-500 hover:text-blue-600 focus:outline-none"
          aria-label="Toggle menu"
        >
          <svg 
            className="h-6 w-6" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        
        {/* Mobile menu dropdown */}
        {isMobileMenuOpen && (
          <div className="bg-white rounded-lg shadow-md p-4 absolute z-50 right-4 mt-2 w-56">
            <nav className="flex flex-col space-y-4">
              <Link 
                to="/admin/patients" 
                className={`font-medium py-2 border-b border-gray-100 ${isActive('/patients') ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Manage Patients
              </Link>
              <Link 
                to="/admin/doctors" 
                className={`font-medium py-2 border-b border-gray-100 ${isActive('/doctors') ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Manage Doctors
              </Link>
              <Link 
                to="/admin/calendar" 
                className={`font-medium py-2 ${isActive('/calendar') ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Admin Calendar
              </Link>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNavbar; 