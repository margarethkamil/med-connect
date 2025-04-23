import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Header: React.FC = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div className="flex items-center justify-between w-full md:w-auto">
            <Link to="/" className="flex items-center">
              <svg 
                className="w-8 h-8 text-blue-600 mr-2" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M20 6h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm-8 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm4-12h-8V4h8v2z" />
              </svg>
              <span className="text-xl font-bold text-gray-800">MedConnect</span>
            </Link>
            
            {/* Mobile menu button - now in the same container as the logo but aligned right */}
            <div className="md:hidden ml-auto">
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
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:block">
            <ul className="flex space-x-8">
              <li>
                <Link 
                  to="/doctors" 
                  className={`font-medium ${
                    isActive('/doctors') 
                      ? 'text-blue-600' 
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  Doctors
                </Link>
              </li>
              <li>
                <Link 
                  to="/appointments" 
                  className={`font-medium ${
                    isActive('/appointments') 
                      ? 'text-blue-600' 
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  My Appointments
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        
        {/* Mobile Navigation Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-2 border-t border-gray-200">
            <nav className="mt-4">
              <ul className="space-y-4">
                <li>
                  <Link 
                    to="/doctors" 
                    className={`block py-2 font-medium ${
                      isActive('/doctors') 
                        ? 'text-blue-600' 
                        : 'text-gray-600 hover:text-blue-600'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Find Doctors
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/appointments" 
                    className={`block py-2 font-medium ${
                      isActive('/appointments') 
                        ? 'text-blue-600' 
                        : 'text-gray-600 hover:text-blue-600'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    My Appointments
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
