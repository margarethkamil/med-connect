import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDoctorStore } from '../store/doctorStore';
import { useAppointmentStore } from '../store/appointmentStore';
import { Doctor } from '../types/doctor';
import { trackCrudEvents } from '../services/analytics';
import { useSeo } from '../services/useSeo';
import { seoConfigs } from '../services/seo';
import AdminNavbar from '../components/AdminNavbar';

const AdminDoctors: React.FC = () => {
  // Apply SEO metadata for the admin doctors page
  useSeo(seoConfigs.admin.doctors());
  
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    specialty: '',
    location: '',
    bio: '',
    photo: '',
    email: '',
    phone: '',
    fee: ''
  });

  // Doctor store
  const doctors = useDoctorStore(state => state.doctors);
  const loading = useDoctorStore(state => state.loading);
  const error = useDoctorStore(state => state.error);
  const fetchDoctors = useDoctorStore(state => state.fetchDoctors);
  const updateDoctorDetails = useDoctorStore(state => state.updateDoctorDetails);
  const createNewDoctor = useDoctorStore(state => state.createNewDoctor);
  const deleteExistingDoctor = useDoctorStore(state => state.deleteExistingDoctor);

  // Check if user is an admin
  const checkAdmin = useCallback(() => {
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');

    if (!userId || userRole !== 'admin') {
      navigate('/login');
      return false;
    }
    return true;
  }, [navigate]);

  // Create a stable function reference for data fetching
  const fetchData = useCallback(async () => {
    if (!checkAdmin()) return;
    
    setRefreshing(true);
    
    await fetchDoctors();
    
    setRefreshing(false);
  }, [fetchDoctors, checkAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter doctors by search term
  const filteredDoctors = doctors.filter(doctor => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      doctor.name.toLowerCase().includes(searchTermLower) ||
      doctor.specialty.toLowerCase().includes(searchTermLower) ||
      doctor.location?.toLowerCase().includes(searchTermLower) ||
      doctor.location === undefined && searchTermLower.includes('no location specified')
    );
  });

  // Open edit modal for a doctor
  const handleEditDoctor = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setUpdateError(null);
    setEditFormData({
      name: doctor.name || '',
      specialty: doctor.specialty || '',
      location: doctor.location || '',
      bio: doctor.bio || '',
      photo: doctor.photo || '',
      email: doctor.email || '',
      phone: doctor.phone || '',
      fee: doctor.fee?.toString() || ''
    });
    setIsEditModalOpen(true);
  };

  // Handle form field changes
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Save doctor changes
  const handleSaveDoctor = async () => {
    // Reset error
    setUpdateError(null);
    
    try {
      const doctorData = {
        name: editFormData.name,
        specialty: editFormData.specialty,
        location: editFormData.location,
        bio: editFormData.bio,
        photo: editFormData.photo,
        email: editFormData.email,
        phone: editFormData.phone,
        fee: editFormData.fee ? parseFloat(editFormData.fee) : undefined
      };
      
      if (editingDoctor) {
        // Update existing doctor
        console.log('Updating doctor:', editingDoctor.id);
        console.log('Update data:', doctorData);
        
        await updateDoctorDetails(editingDoctor.id, doctorData);
        
        // Track doctor update
        trackCrudEvents.updateDoctor(editingDoctor.id, doctorData.name);
      } else {
        // Create new doctor
        console.log('Creating new doctor');
        console.log('Doctor data:', doctorData);
        
        await createNewDoctor(doctorData);
        
        // Track doctor creation
        trackCrudEvents.createDoctor(doctorData.name);
      }
      
      // Close the modal and refresh the data
      setIsEditModalOpen(false);
      setEditingDoctor(null);
      
      // Refresh the doctor list
      fetchData();
    } catch (error) {
      console.error('Error saving doctor:', error);
      setUpdateError(error instanceof Error ? error.message : 'Failed to save doctor information');
    }
  };

  // Add a new doctor
  const handleAddDoctor = () => {
    setEditingDoctor(null);
    setUpdateError(null);
    setEditFormData({
      name: '',
      specialty: '',
      location: '',
      bio: '',
      photo: '',
      email: '',
      phone: '',
      fee: ''
    });
    setIsEditModalOpen(true);
  };

  // Delete a doctor
  const handleDeleteDoctor = async (doctorId: string) => {
    if (!window.confirm('Are you sure you want to delete this doctor? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('Deleting doctor:', doctorId);
      
      // Get doctor name before deletion for analytics
      const doctorToDelete = doctors.find(doc => doc.id === doctorId);
      const doctorName = doctorToDelete?.name || 'Unknown Doctor';
      
      await deleteExistingDoctor(doctorId);
      
      // Track doctor deletion
      trackCrudEvents.deleteDoctor(doctorId, doctorName);
      
      // Refresh the doctor list
      fetchData();
    } catch (error) {
      console.error('Error deleting doctor:', error);
      alert('Failed to delete doctor: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // If the page is initially loading
  if (loading && !refreshing && doctors.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <AdminNavbar />
        <div className="py-8 text-center">
          <svg className="mx-auto animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg text-gray-600">Loading doctors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <AdminNavbar />
      
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
        <h1 className="text-2xl font-bold text-gray-900 text-center sm:text-left">Doctor Management</h1>
      </div>
      
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <p className="text-gray-600 text-center sm:text-left">View and manage all doctors in the system</p>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search doctors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 mt-2 sm:mt-0">
              <button 
                onClick={handleAddDoctor} 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Doctor
              </button>
              
              <button 
                onClick={fetchData} 
                disabled={refreshing}
                className={`px-4 py-2 rounded-md flex items-center space-x-2 ${refreshing ? 'bg-gray-300' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {refreshing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Refreshing...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Refresh</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-100 text-red-800 p-4 rounded-md mb-6">
            <p>Error: {error}</p>
          </div>
        )}

        {/* Doctors List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredDoctors.length === 0 ? (
              <li className="px-6 py-4 text-center text-gray-500">
                {searchTerm ? 'No doctors matching your search' : 'No doctors found in the system'}
              </li>
            ) : (
              filteredDoctors.map(doctor => (
                <li key={doctor.id}>
                  <div className="px-4 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-shrink-0 h-16 w-16 mx-auto sm:mx-0">
                        <img 
                          className="h-16 w-16 rounded-full object-cover" 
                          src={doctor.photo || 'https://via.placeholder.com/150?text=Doctor'} 
                          alt={doctor.name} 
                        />
                      </div>
                      <div className="text-center sm:text-left">
                        <div className="text-sm font-medium text-blue-600">{doctor.name}</div>
                        <div className="text-sm text-gray-500">{doctor.specialty}</div>
                        <div className="text-sm text-gray-500">{doctor.location || 'No location specified'}</div>
                        <div className="text-sm text-gray-500">
                          <span className="font-medium">Fee:</span> {doctor.fee ? `$${doctor.fee}` : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center sm:justify-end space-x-2">
                      <button
                        onClick={() => handleEditDoctor(doctor)}
                        className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteDoctor(doctor.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* Doctor Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {updateError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
                <p className="text-sm">{updateError}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditFormChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="specialty" className="block text-sm font-medium text-gray-700">Specialty</label>
                <input
                  type="text"
                  id="specialty"
                  name="specialty"
                  value={editFormData.specialty}
                  onChange={handleEditFormChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={editFormData.location}
                  onChange={handleEditFormChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="fee" className="block text-sm font-medium text-gray-700">Fee ($)</label>
                <input
                  type="number"
                  id="fee"
                  name="fee"
                  value={editFormData.fee}
                  onChange={handleEditFormChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={editFormData.email}
                  onChange={handleEditFormChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  value={editFormData.phone}
                  onChange={handleEditFormChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="photoUrl" className="block text-sm font-medium text-gray-700">Photo URL</label>
                <input
                  type="text"
                  id="photo"
                  name="photo"
                  value={editFormData.photo}
                  onChange={handleEditFormChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="https://example.com/doctor-photo.jpg"
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  value={editFormData.bio}
                  onChange={handleEditFormChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                ></textarea>
              </div>
            </div>
            
            <div className="mt-5 flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-full sm:w-auto py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDoctor}
                className="w-full sm:w-auto py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {editingDoctor ? 'Save Changes' : 'Add Doctor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDoctors; 