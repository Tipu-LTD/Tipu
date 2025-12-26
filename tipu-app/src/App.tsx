import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ScrollToTop } from "@/components/ScrollToTop";
import { isAdult } from "@/utils/age";
import Index from "./pages/Index";
import About from "./pages/About";
import OurTutors from "./pages/OurTutors";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Tutors from "./pages/Tutors";
import TutorProfile from "./pages/TutorProfile";
import DashboardRouter from "./pages/dashboard/DashboardRouter";
import StudentDashboard from "./pages/dashboard/StudentDashboard";
import TutorDashboard from "./pages/dashboard/TutorDashboard";
import TutorStudents from "./pages/dashboard/TutorStudents";
import ParentDashboard from "./pages/dashboard/ParentDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import StudentBookings from "./pages/bookings/StudentBookings";
import TutorRequests from "./pages/bookings/TutorRequests";
import TutorSchedule from "./pages/bookings/TutorSchedule";
import BookingDetails from "./pages/bookings/BookingDetails";
import BookingConfirmation from "./pages/BookingConfirmation";
import AddChild from "./pages/children/AddChild";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Lessons from "./pages/lessons/Lessons";
import SubjectLessons from "./pages/lessons/SubjectLessons";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Wrapper component for adult-only student routes
const AdultStudentRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  if (user?.role === 'student' && user.dateOfBirth) {
    const adult = isAdult(user.dateOfBirth);
    if (!adult) {
      // Minor student trying to access adult-only page -> redirect to lessons
      return <Navigate to="/lessons" replace />;
    }
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/our-tutors" element={<OurTutors />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Tutor Browse - Adult students & parents only */}
            <Route path="/tutors" element={
              <ProtectedRoute allowedRoles={['student', 'parent']}>
                <AdultStudentRoute>
                  <Tutors />
                </AdultStudentRoute>
              </ProtectedRoute>
            } />

            <Route path="/tutors/:id" element={
              <ProtectedRoute allowedRoles={['student', 'parent']}>
                <AdultStudentRoute>
                  <TutorProfile />
                </AdultStudentRoute>
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

            <Route path="/dashboard/students" element={
              <ProtectedRoute allowedRoles={['tutor']}>
                <TutorStudents />
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
            
            {/* Lessons Routes - All students */}
            <Route path="/lessons" element={
              <ProtectedRoute allowedRoles={['student']}>
                <Lessons />
              </ProtectedRoute>
            } />

            <Route path="/lessons/:subject" element={
              <ProtectedRoute allowedRoles={['student']}>
                <SubjectLessons />
              </ProtectedRoute>
            } />

            {/* Booking Routes - Adult students & parents only */}
            <Route path="/bookings" element={
              <ProtectedRoute allowedRoles={['student', 'parent']}>
                <AdultStudentRoute>
                  <StudentBookings />
                </AdultStudentRoute>
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

            {/* Children Management */}
            <Route path="/children/add" element={
              <ProtectedRoute allowedRoles={['parent']}>
                <AddChild />
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
