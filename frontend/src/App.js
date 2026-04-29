import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Playrooms from "./pages/Playrooms";
import CreatePlayroom from "./pages/CreatePlayroom";
import ManagePlayroom from "./pages/ManagePlayroom";
import AdminPanel from "./pages/AdminPanel";
import PlayroomDetails from "./pages/PlayroomDetails";
import Book from "./pages/Book";
import BookingSuccess from "./pages/BookingSuccess";
import MyBookings from "./pages/MyBookings";
import OwnerTimeSlots from "./pages/OwnerTimeSlots";
import OwnerDashboard from "./pages/OwnerDashboard";
import "./styles/global.css";
import { ToastProvider } from "./context/ToastContext";
import ToastContainer from "./components/ToastContainer";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import BookingPolicy from "./pages/BookingPolicy";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="container loading">Učitavanje...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (
    Array.isArray(allowedRoles) &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user?.role)
  ) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const VlasnikRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={["vlasnik", "admin"]}>
    {children}
  </ProtectedRoute>
);

const AdminRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={["admin"]}>{children}</ProtectedRoute>
);

const RoditeljRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={["roditelj", "admin"]}>
    {children}
  </ProtectedRoute>
);

function AppRoutes() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/booking-policy" element={<BookingPolicy />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/playrooms" element={<Playrooms />} />
        <Route path="/playrooms/:id" element={<PlayroomDetails />} />

        {/* BOOK mora biti JAVAN */}
        <Route path="/book/:id" element={<Book />} />

        <Route
          path="/booking-success"
          element={
            <RoditeljRoute>
              <BookingSuccess />
            </RoditeljRoute>
          }
        />

        <Route
          path="/my-bookings"
          element={
            <RoditeljRoute>
              <MyBookings />
            </RoditeljRoute>
          }
        />

        <Route
          path="/create-playroom"
          element={
            <VlasnikRoute>
              <CreatePlayroom />
            </VlasnikRoute>
          }
        />

        <Route
          path="/manage-playroom"
          element={
            <VlasnikRoute>
              <ManagePlayroom />
            </VlasnikRoute>
          }
        />

        <Route
          path="/owner/timeslots"
          element={
            <VlasnikRoute>
              <OwnerTimeSlots />
            </VlasnikRoute>
          }
        />

        <Route
          path="/owner/dashboard"
          element={
            <VlasnikRoute>
              <OwnerDashboard />
            </VlasnikRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Footer />
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <ToastContainer />
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}
