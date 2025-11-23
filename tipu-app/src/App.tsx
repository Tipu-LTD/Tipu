import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Tutors from "./pages/Tutors";
import TutorProfile from "./pages/TutorProfile";
import DashboardRouter from "./pages/dashboard/DashboardRouter";
import StudentDashboard from "./pages/dashboard/StudentDashboard";
import TutorDashboard from "./pages/dashboard/TutorDashboard";
import ParentDashboard from "./pages/dashboard/ParentDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import StudentBookings from "./pages/bookings/StudentBookings";
import TutorRequests from "./pages/bookings/TutorRequests";
import TutorSchedule from "./pages/bookings/TutorSchedule";
import BookingDetails from "./pages/bookings/BookingDetails";
import BookingConfirmation from "./pages/BookingConfirmation";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Tutor Browse */}
            <Route path="/tutors" element={
              <ProtectedRoute allowedRoles={['student', 'parent']}>
                <Tutors />
              </ProtectedRoute>
            } />
            
            <Route path="/tutors/:id" element={
              <ProtectedRoute allowedRoles={['student', 'parent']}>
                <TutorProfile />
              </ProtectedRoute>
            } />
            
            {/* Dashboard Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard/student" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard/tutor" element={
              <ProtectedRoute allowedRoles={['tutor']}>
                <TutorDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard/parent" element={
              <ProtectedRoute allowedRoles={['parent']}>
                <ParentDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            {/* Profile & Settings */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            
            {/* Booking Routes */}
            <Route path="/bookings" element={
              <ProtectedRoute allowedRoles={['student', 'parent']}>
                <StudentBookings />
              </ProtectedRoute>
            } />
            
            <Route path="/bookings/requests" element={
              <ProtectedRoute allowedRoles={['tutor']}>
                <TutorRequests />
              </ProtectedRoute>
            } />
            
            <Route path="/bookings/schedule" element={
              <ProtectedRoute allowedRoles={['tutor']}>
                <TutorSchedule />
              </ProtectedRoute>
            } />
            
            <Route path="/bookings/:id" element={
              <ProtectedRoute>
                <BookingDetails />
              </ProtectedRoute>
            } />
            
            <Route path="/bookings/confirmation/:bookingId" element={
              <ProtectedRoute allowedRoles={['student', 'parent']}>
                <BookingConfirmation />
              </ProtectedRoute>
            } />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
