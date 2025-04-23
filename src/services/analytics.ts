// src/services/analytics.ts
// Google Analytics (GA4) integration for event and pageview tracking
// Install with: npm install react-ga4

import ReactGA from 'react-ga4';

// Replace with your GA4 Measurement ID
const GA_MEASUREMENT_ID = 'G-3PW6LS3J0J';

// Initialize GA4 (call once, e.g., in App.tsx)
export const initAnalytics = () => {
  if (process.env.NODE_ENV === 'production') {
    ReactGA.initialize(GA_MEASUREMENT_ID);
  }
};

// Track a page view
export const trackPageView = (path: string) => {
  if (process.env.NODE_ENV === 'production') {
    ReactGA.send({ hitType: 'pageview', page: path });
  }
};

// Track a custom event
export const trackEvent = (category: string, action: string, label?: string, value?: number) => {
  if (process.env.NODE_ENV === 'production') {
    ReactGA.event({
      category,
      action,
      label,
      value,
    });
  }
};

// Track errors
export const trackError = (errorSource: string, errorMessage: string, errorDetails?: any) => {
  const userId = localStorage.getItem('userId') || 'anonymous';
  const label = `User:${userId} | Source:${errorSource} | Message:${errorMessage}`;
  const errorData = errorDetails ? JSON.stringify(errorDetails).substring(0, 500) : '';
  
  //console.error(`Analytics Error: ${label} | Details: ${errorData}`);
  trackEvent('Error', errorSource, label);
};

// Track user authentication events
export const trackUserEvents = {
  login: (email: string, isAdmin: boolean = false) => {
    const role = isAdmin ? 'admin' : 'user';
    trackEvent('User', 'Login', `Email:${email} | Role:${role}`);
  },
  
  logout: (email: string) => {
    trackEvent('User', 'Logout', `Email:${email}`);
  }
};

// Simple CRUD tracking helpers
export const trackCrudEvents = {
  // Doctor CRUD
  createDoctor: (doctorName: string) => {
    const userId = localStorage.getItem('userId') || 'anonymous';
    trackEvent('Doctor', 'Create', `User:${userId} | Doctor:${doctorName}`);
  },
  
  updateDoctor: (doctorId: string, doctorName: string) => {
    const userId = localStorage.getItem('userId') || 'anonymous';
    trackEvent('Doctor', 'Update', `User:${userId} | Doctor:${doctorName} (${doctorId})`);
  },
  
  deleteDoctor: (doctorId: string, doctorName: string) => {
    const userId = localStorage.getItem('userId') || 'anonymous';
    trackEvent('Doctor', 'Delete', `User:${userId} | Doctor:${doctorName} (${doctorId})`);
  },
  
  // Appointment CRUD
  createAppointment: (doctorName: string, dateTime: string) => {
    const userId = localStorage.getItem('userId') || 'anonymous';
    trackEvent('Appointment', 'Create', `User:${userId} | Doctor:${doctorName} | Time:${dateTime}`);
  },
  
  updateAppointment: (appointmentId: string, status: string) => {
    const userId = localStorage.getItem('userId') || 'anonymous';
    trackEvent('Appointment', 'Update', `User:${userId} | Appointment:${appointmentId} | Status:${status}`);
  },
  
  cancelAppointment: (appointmentId: string) => {
    const userId = localStorage.getItem('userId') || 'anonymous';
    trackEvent('Appointment', 'Cancel', `User:${userId} | Appointment:${appointmentId}`);
  }
};
