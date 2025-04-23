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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to Doctor Booking
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to manage your appointments
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
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
                className={`appearance-none relative block w-full px-3 py-3 border ${isAdmin ? 'border-blue-500' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Enter your email address"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white 
                ${isValid && !isSubmitting 
                  ? 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500' 
                  : 'bg-blue-400 cursor-not-allowed'}`}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Continue'
              )}
            </button>
          </div>

          <div className="flex flex-col items-center space-y-4">
            <div className="text-sm text-gray-500">
              <p>This is a demo app. No password needed.</p>
            </div>
            
            <div className="border-t border-gray-200 w-full pt-4">
              <p className="text-sm text-center text-gray-500 mb-2">So you want to see the admin page? Sure, here you go:</p>
              <button
                type="button"
                onClick={handleAdminLogin}
                className="w-full flex justify-center items-center px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 005 10a6 6 0 0012 0c0-.35-.035-.691-.1-1.021A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
                Log in as Admin
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 