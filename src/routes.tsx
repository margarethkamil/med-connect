// src/routes.tsx
import { createBrowserRouter, RouteObject, Navigate } from 'react-router-dom'
import React from 'react'
import AppLayout from './App'
import Doctors from './pages/doctors'
import Appointments from './pages/appointments'
import Login from './pages/login'
import AdminCalendar from './pages/adminCalendar'
import AdminDoctors from './pages/adminDoctors'

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = localStorage.getItem('userId') !== null;
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Admin route wrapper
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = localStorage.getItem('userId') !== null;
  const isAdmin = localStorage.getItem('userRole') === 'admin';
  
  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const routes: RouteObject[] = [
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/doctors" replace />
      },
      {
        path: 'doctors',
        element: <Doctors />
      },
      {
        path: 'appointments',
        element: (
          <ProtectedRoute>
            <Appointments />
          </ProtectedRoute>
        )
      },
      {
        path: 'admin/calendar',
        element: (
          <AdminRoute>
            <AdminCalendar />
          </AdminRoute>
        )
      },
      {
        path: 'admin/doctors',
        element: (
          <AdminRoute>
            <AdminDoctors />
          </AdminRoute>
        )
      },
    ]
  },
]

export const router = createBrowserRouter(routes)
