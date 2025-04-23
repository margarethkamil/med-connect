import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Header: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <Link to="/" className="flex items-center">
              <svg 
                className="w-8 h-8 text-blue-600 mr-2" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M20 6h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm-8 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm4-12h-8V4h8v2z" />
              </svg>
              <span className="text-xl font-bold text-gray-800">EasyMedi</span>
            </Link>
          </div>
          
          <nav>
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
      </div>
    </header>
  );
};
