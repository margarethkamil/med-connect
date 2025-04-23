# Doctor Booking Application

A modern, production-ready web application for booking appointments with doctors, built with **React**, **TypeScript**, and **Vite**.

**Key Frontend Highlights:**
- **State Management with Zustand:** Efficient, scalable, and minimal state management using Zustand for both doctors and appointments.
- **Responsive Design:** Fully responsive UI, optimized for all devices (mobile, tablet, desktop) using Tailwind CSS and custom breakpoints.
- **UI/UX Excellence:** Clean, intuitive, and accessible user interfaces with a focus on user experience and usability best practices.
- **Component-Driven Architecture:** Modular, reusable React components for maintainability and scalability.
- **Modern Frontend Best Practices:** Type safety, code splitting, lazy loading, hooks, and clear separation of concerns throughout the codebase.
- **Robust Error Handling:** User-friendly error messages and loading states for all asynchronous operations.

## Project Structure

```
doctor-booking/
├── public/                  # Static assets
├── src/
│   ├── api/                 # API client for backend communication
│   ├── assets/              # Static assets (images, fonts)
│   ├── components/          # Reusable React components
│   ├── pages/               # Top-level pages (Doctors, Appointments, Admin)
│   ├── services/            # Service integrations
│   │   ├── analytics.ts     # Google Analytics integration
│   │   ├── seo.ts           # SEO configurations
│   ├── store/               # Zustand stores for state management
│   ├── types/               # TypeScript type definitions
│   ├── App.css              # Main application styles
│   ├── App.tsx              # Main app layout and routing
│   ├── index.css            # Global CSS (Tailwind imports)
│   ├── main.tsx             # App entry point
│   ├── routes.tsx           # Route definitions
├── README.md
├── package.json
└── ... (config and environment files)

```

## Features

### User Features
- Browse available doctors with filtering and search capabilities
- View doctor details including specialties, locations, ratings, and fees
- Book appointments with doctors on available dates and times
- Manage and view upcoming appointments
- Cancel or reschedule existing appointments
- Mobile-friendly navigation for access to all features on smaller devices

### Admin Features
- Admin dashboard with calendar view of all appointments
- Manage doctors (add, edit, delete)
- Manage patients (view, edit patient details)
- View and manage all appointments in the system
- Filter appointments by status and doctor

## Authentication

The application uses a simple email-based authentication system:
- User authentication via email
- Role-based access (admin vs regular user)
- Protected routes requiring authentication

## Mobile Navigation

The application includes a responsive mobile navigation system:
- Hamburger menu icon positioned next to the MedConnect logo for easy access
- Collapsible menu that shows/hides navigation options
- Context-aware menu items (different options for admin vs regular users)
- Smooth transitions and animations for a polished user experience
- Auto-close on navigation to reduce user actions

## API Endpoints

The application uses the following API endpoints:

### Doctor Endpoints
- `GET /doctors` - Get all doctors (optional query param: `include_availability=true`)
- `GET /doctors/:id` - Get details for a specific doctor
- `GET /doctors/:id/availability` - Get availability slots for a specific doctor
- `POST /doctors` - Create a new doctor (admin only)
- `PUT /doctors/:id` - Update doctor details (admin only)
- `DELETE /doctors/:id` - Delete a doctor (admin only)

### Appointment Endpoints
- `GET /appointments/user/:userId` - Get appointments for a specific user
- `GET /appointments/:id` - Get details for a specific appointment
- `GET /appointments/available/:doctorId/:dateTime` - Check if a slot is available
- `GET /appointments/admin` - Get all appointments (admin only, supports pagination)
- `POST /appointments` - Create a new appointment
- `PUT /appointments/:id/status` - Update appointment status
- `DELETE /appointments/:id` - Cancel/delete an appointment

### Patient Endpoints
- `GET /patients/:id` - Get details for a specific patient by ID
- `GET /patients/user/:userId` - Get patient details by user ID (email)
- `POST /patients` - Create a new patient
- `PUT /patients/:id` - Update patient details

## Data Structures

### Doctor
```typescript
interface Doctor {
  id: string;
  name: string;
  specialty: string;
  photo?: string;
  bio?: string;
  rating?: number;
  reviewCount?: number;
  location?: string;
  availability?: string[]; // ISO datetime strings for available days
  email?: string;
  phone?: string;
  fee?: number;
  createdAt?: string;
}
```

Example Doctor Object:
```javascript
{
  id: "3nfGzWsJ8m7k2LizZ6Sc",
  name: "Dr. John Brown",
  specialty: "Oncology",
  location: "San Antonio",
  bio: "This is the Bio and can be modified.",
  photo: "https://randomuser.me/api/portraits/men/38.jpg",
  rating: 4.4,
  email: "johnbrown@mail.com",
  phone: "88888888",
  fee: 55,
  createdAt: "2025-04-23T00:14:16.998Z",
  availability: [
    "2025-04-25T08:00:00Z",
    "2025-04-26T08:00:00Z",
    "2025-04-27T08:00:00Z",
    // More dates...
  ]
}
```

### Appointment
```typescript
interface Appointment {
  id: string;
  doctorId: string;
  patientId?: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  date: string;
  time: string;
  reason?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  dateTime?: string;
  doctorName?: string;
  createdAt: string;
  updatedAt?: string;
}
```

### Booking Request
```typescript
interface BookingRequest {
  doctorId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  date: string;
  time: string;
  dateTime: string;
  reason?: string;
  userId: string;
  status?: 'confirmed' | 'pending' | 'cancelled';
}
```

### Patient
```typescript
interface PatientData {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  dateOfBirth?: string;
}
```

## Recent Updates

- **Patient Management:** Added ability to create, view, and edit patient records
- **Mobile Navigation:** Implemented responsive menu system for all screen sizes
- **Appointments UI Enhancement:** Redesigned appointments page with improved calendar and visualization
- **Doctor Filtering:** Enhanced doctor filtering by availability and specialty
- **Optimized Doctor Cards:** Improved performance and visual design of doctor listing

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open your browser to the local development URL

## Backend

The application is fully functional and deployed online, using a Firebase backend with the following base URL:

`https://us-central1-doctor-booking-backend-5c6aa.cloudfunctions.net/api`

## Doctor Booking Backend – Tech Stack & Architecture

**Main Technologies:**
- **Node.js** – JavaScript runtime powering the backend logic.
- **Express.js** – Robust web framework for handling HTTP requests and routing.
- **Firebase Cloud Functions** – Serverless deployment for scalable, managed API hosting.
- **Firebase Firestore** – NoSQL database for storing doctors, appointments, and users.
- **Firebase Admin SDK** – Secure server-side access to Firestore and other Firebase services.

**Key Features:**
- RESTful API for managing doctors, appointments, and availability.
- Patient CRUD operations for user management.
- Appointment booking, cancellation, and status management.
- Admin endpoints for listing and filtering all appointments.
- CORS enabled for seamless frontend-backend communication.
- Pagination and filtering support for large datasets.
- Firestore composite indexes for efficient queries.

**Project Structure:**
- `functions/index.js` – Main entry point, Express app, and Cloud Function export.
- `functions/models/` – Data access and business logic for doctors and appointments.
- `functions/controllers/` – Request handling and response formatting.
- `functions/routes/` – (Optional) Route definitions for modularity.
- `firestore.indexes.json` – Firestore composite index definitions.

**Deployment:**
- Deployed as a single Cloud Function (`api`) using the Firebase CLI.
---

**Developed by Margareth Ortiz**

## AI-Assisted Development

AI tools were used to enhance the development process of this project:

- **ChatGPT** was used to:
  - Refine the content and structure of the `README.md` for clarity and professionalism.
  - Provide code suggestions and assist in debugging throughout development.
  - Evaluate different project structures by referencing official documentation and community best practices.

- **Cursor** and **ChatGPT** together helped:
  - Streamline the workflow.
  - Ensure better code organization and documentation quality.
  - Understand requirements using the latest information by leveraging [Cursor](https://www.cursor.so/) for up-to-date context and resources.

## Known Limitations & Next Steps

**Known Limitations:**
- No support for recurring appointments or appointment reminders.
- Basic authentication (email only); no OAuth or multi-factor authentication.
- No payment integration for booking or doctor fees.
- Admin features are limited.

**Next Steps / Future Improvements:**
- Add support for appointment reminders and notifications (email/SMS).
- Integrate payment processing for doctor fees.
- Enhance authentication with OAuth and multi-factor support.
- Expand admin dashboard with analytics and reporting.
- Improve accessibility and add localization support.
- Implement user reviews and doctor ratings.
- Add support for recurring appointments.
