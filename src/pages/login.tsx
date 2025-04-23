import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackUserEvents, trackError } from '../services/analytics';
import { useSeo } from '../services/useSeo';
import { seoConfigs } from '../services/seo';

const Login: React.FC = () => {
  // Apply SEO metadata for the login page
  useSeo(seoConfigs.login());
  
  const [email, setEmail] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    
    if (storedUserId) {
      if (userRole === 'admin') {
        navigate('/admin/calendar');
      } else {
        navigate('/doctors');
      }
    }
  }, [navigate]);

  // Validate email
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsValid(emailRegex.test(email));
  }, [email]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid) {
      setError('Please enter a valid email address');
      // Track validation error
      trackError('Login', 'Invalid email format', { email });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      setTimeout(() => {
        // Store the email in localStorage
        localStorage.setItem('userId', email);
        localStorage.setItem('userRole', isAdmin ? 'admin' : 'user');
        
        // Track successful login
        trackUserEvents.login(email, isAdmin);
        
        // Redirect based on role
        if (isAdmin) {
          navigate('/admin/calendar');
        } else {
          navigate('/doctors');
        }
        
        setIsSubmitting(false);
      }, 800); // Simulate a short delay for better UX
    } catch (error) {
      // Track login error
      trackError('Login', 'Login failed', { email, error });
      setError('Login failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleAdminLogin = () => {
    setIsAdmin(true);
    setEmail('admin@doctorbooking.com');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Left panel with illustration - hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-12 flex-col justify-between">
        <div>
          <div className="flex items-center">
            <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.5 12.5719C19.5 14.1 19.1768 15.5719 18.5304 16.8789C17.884 18.1858 16.986 19.2279 15.8364 20.0049C14.6867 20.7819 13.3589 21.1704 11.8528 21.1704C10.3239 21.1704 8.97203 20.7789 7.7972 19.9959C6.62236 19.2129 5.71866 18.1678 5.0761 16.8609C4.43355 15.5539 4.11227 14.0849 4.11227 12.5538C4.11227 11.0228 4.43355 9.65084 5.0761 8.43792C5.71866 7.22499 6.63097 6.25799 7.81302 5.53693C8.99508 4.81586 10.3526 4.45532 11.8856 4.45532C13.0762 4.45532 14.171 4.69332 15.1698 5.16931C16.1687 5.6453 16.9927 6.32025 17.6418 7.19414L15.1698 9.53799C14.7762 8.99295 14.2943 8.57387 13.7242 8.28077C13.154 7.98767 12.5464 7.84111 11.9012 7.84111C11.049 7.84111 10.2967 8.04698 9.64432 8.45871C8.99191 8.87044 8.48182 9.45157 8.11404 10.2021C7.74627 10.9525 7.56239 11.7972 7.56239 12.736C7.56239 13.6508 7.74627 14.4682 8.11404 15.1883C8.48182 15.9083 9.00052 16.4686 9.67014 16.8691C10.3398 17.2697 11.1014 17.47 11.9548 17.47C12.8658 17.47 13.6353 17.26 14.2633 16.84C14.8913 16.42 15.3533 15.818 15.6492 15.034H11.9548V11.75H19.5V12.5719Z" fill="currentColor"/>
            </svg>
            <span className="ml-2 text-2xl font-bold tracking-tight">MedConnect</span>
          </div>
          <h1 className="mt-16 text-4xl font-extrabold leading-tight">
            Book your medical appointments with ease
          </h1>
          <p className="mt-6 text-blue-100 text-lg max-w-md">
            Connect with top doctors, manage your appointments, and take control of your healthcare journey.
          </p>
          
          <div className="mt-12 grid grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl">
              <svg className="w-10 h-10 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
              <h3 className="mt-3 text-white font-semibold">Verified Doctors</h3>
              <p className="mt-1 text-blue-100 text-sm">All our doctors are verified professionals.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl">
              <svg className="w-10 h-10 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h3 className="mt-3 text-white font-semibold">Quick Booking</h3>
              <p className="mt-1 text-blue-100 text-sm">Schedule appointments in minutes.</p>
            </div>
          </div>
        </div>
        
        <div className="mt-auto">
          <p className="text-blue-100 text-sm">
            © {new Date().getFullYear()} MedConnect. All rights reserved.
          </p>
        </div>
      </div>
      
      {/* Right panel with login form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile only logo */}
          <div className="md:hidden flex justify-center mb-6">
            <div className="flex items-center">
              <svg className="h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.5 12.5719C19.5 14.1 19.1768 15.5719 18.5304 16.8789C17.884 18.1858 16.986 19.2279 15.8364 20.0049C14.6867 20.7819 13.3589 21.1704 11.8528 21.1704C10.3239 21.1704 8.97203 20.7789 7.7972 19.9959C6.62236 19.2129 5.71866 18.1678 5.0761 16.8609C4.43355 15.5539 4.11227 14.0849 4.11227 12.5538C4.11227 11.0228 4.43355 9.65084 5.0761 8.43792C5.71866 7.22499 6.63097 6.25799 7.81302 5.53693C8.99508 4.81586 10.3526 4.45532 11.8856 4.45532C13.0762 4.45532 14.171 4.69332 15.1698 5.16931C16.1687 5.6453 16.9927 6.32025 17.6418 7.19414L15.1698 9.53799C14.7762 8.99295 14.2943 8.57387 13.7242 8.28077C13.154 7.98767 12.5464 7.84111 11.9012 7.84111C11.049 7.84111 10.2967 8.04698 9.64432 8.45871C8.99191 8.87044 8.48182 9.45157 8.11404 10.2021C7.74627 10.9525 7.56239 11.7972 7.56239 12.736C7.56239 13.6508 7.74627 14.4682 8.11404 15.1883C8.48182 15.9083 9.00052 16.4686 9.67014 16.8691C10.3398 17.2697 11.1014 17.47 11.9548 17.47C12.8658 17.47 13.6353 17.26 14.2633 16.84C14.8913 16.42 15.3533 15.818 15.6492 15.034H11.9548V11.75H19.5V12.5719Z" fill="currentColor"/>
              </svg>
              <span className="ml-2 text-2xl font-bold tracking-tight text-blue-600">MedConnect</span>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome back</h2>
            <p className="text-gray-500 mb-8">Sign in to your account to continue</p>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                      setIsAdmin(false);
                    }}
                    className={`pl-10 w-full py-3 border ${isAdmin ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900`}
                    placeholder="you@example.com"
                  />
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-600">
                    {error}
                  </p>
                )}
                {isAdmin && !error && (
                  <p className="mt-2 text-sm text-blue-600">
                    Admin account selected
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!isValid || isSubmitting}
                className={`w-full flex justify-center items-center rounded-lg py-3 px-4 text-white font-medium transition-all duration-200 
                  ${isValid && !isSubmitting 
                    ? 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500' 
                    : 'bg-blue-400 cursor-not-allowed'}`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                    </svg>
                    Sign In
                  </>
                )}
              </button>
              
              <div className="text-center text-sm text-gray-500">
                <p>This is a demo app. No password needed.</p>
              </div>
            </form>
            
            <div className="mt-8 pt-5 border-t border-gray-200">
              <p className="text-center text-sm text-gray-500 mb-3">
                Want to see the admin dashboard?
              </p>
              <button
                type="button"
                onClick={handleAdminLogin}
                className="w-full flex justify-center items-center px-4 py-3 rounded-lg text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="mr-2 h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Log in as Admin
              </button>
            </div>
          </div>
          
          {/* Mobile-only feature highlights */}
          <div className="md:hidden mt-8 grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
              <h3 className="mt-2 text-gray-800 font-semibold text-sm">Verified Doctors</h3>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h3 className="mt-2 text-gray-800 font-semibold text-sm">Quick Booking</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 