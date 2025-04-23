// src/App.tsx
import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { initAnalytics, trackPageView } from './services/analytics';

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    // Check if user is logged in and if they are an admin
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    
    setIsLoggedIn(!!userId);
    setIsAdmin(userRole === 'admin');
  }, [location.pathname]); // Re-check when route changes

  // Initialize analytics once on mount
  useEffect(() => {
    initAnalytics();
  }, []);

  // Track page views on route change
  useEffect(() => {
    trackPageView(window.location.pathname + window.location.search);
  }, [location.pathname]);
  
  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    const userId = localStorage.getItem('userId');
    // Track user logout before clearing localStorage
    if (userId) {
      import('./services/analytics').then(({ trackUserEvents }) => {
        trackUserEvents.logout(userId);
      });
    }
    
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    setIsLoggedIn(false);
    setIsAdmin(false);
    navigate('/login');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto py-4 px-4">
          <nav className="flex justify-between items-center">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-blue-600">MedConnect</Link>
              {isAdmin && (
                <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full font-medium">
                  Admin
                </span>
              )}
            </div>
            <div className="hidden md:flex items-center space-x-6">
              {isAdmin ? (
                <>
                  <Link 
                    to="/admin/calendar" 
                    className={`px-3 py-2 text-sm font-medium ${isActivePath('/admin/calendar') ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}
                  >
                    Admin Calendar
                  </Link>
                  <Link 
                    to="/admin/doctors" 
                    className={`px-3 py-2 text-sm font-medium ${isActivePath('/admin/doctors') ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}
                  >
                    Manage Doctors
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    to="/doctors" 
                    className={`px-3 py-2 text-sm font-medium ${isActivePath('/doctors') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
                  >
                    Find Doctors
                  </Link>
                  {isLoggedIn && (
                    <Link 
                      to="/appointments" 
                      className={`px-3 py-2 text-sm font-medium ${isActivePath('/appointments') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
                    >
                      My Appointments
                    </Link>
                  )}
                </>
              )}
            </div>
            <div>
              {isLoggedIn ? (
                <button 
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign Out
                </button>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </nav>
        </div>
      </header>
      
      <main className="flex-grow">
        <Outlet />
      </main>
      
      <footer className="bg-gray-800 text-white py-4 mt-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} MedConnect. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
