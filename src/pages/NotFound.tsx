import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen px-4">
      <h1 className="text-6xl font-bold text-red-500 mb-4">404</h1>
      <h2 className="text-2xl font-medium text-gray-700 mb-6">Page Not Found</h2>
      <p className="text-gray-500 mb-8 text-center">The page you are looking for does not exist or you don't have permission to access it.</p>
      <Link 
        to="/"
        className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
      >
        Go Home
      </Link>
    </div>
  );
};

export default NotFound; 