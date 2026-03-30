import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
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
import ManageTimeSlots from "./pages/ManageTimeSlots";
import OwnerTimeSlots from "./pages/OwnerTimeSlots";
import OwnerDashboard from "./pages/OwnerDashboard";
import "./styles/global.css";

// ============================================
// KOMPONENTE ZA ZAŠTITU RUTA
// ============================================

// Zaštita - samo vlasnici i admini
const VlasnikRoute = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (user?.role !== "vlasnik" && user?.role !== "admin") {
    return <Navigate to="/" />;
  }

  return children;
};

// Zaštita - samo admini
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/" />;
  }

  return children;
};

// Zaštita - samo roditelji i admini
const RoditeljRoute = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (user?.role !== "roditelj" && user?.role !== "admin") {
    return <Navigate to="/" />;
  }

  return children;
};

// ============================================
// GLAVNA APP KOMPONENTA
// ============================================
function AppRoutes() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/playrooms" element={<Playrooms />} />
        <Route path="/playrooms/:id" element={<PlayroomDetails />} />
        <Route path="/book/:id" element={<Book />} />
        <Route path="/booking-success" element={<BookingSuccess />} />

        <Route
          path="/my-bookings"
          element={
            <RoditeljRoute>
              <MyBookings />
            </RoditeljRoute>
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
          path="/create-playroom"
          element={
            <VlasnikRoute>
              <CreatePlayroom />
            </VlasnikRoute>
          }
        />
        <Route
          path="/manage-slots"
          element={
            <VlasnikRoute>
              <ManageTimeSlots />
            </VlasnikRoute>
          }
        />
        <Route
          path="/owner-slots"
          element={
            <VlasnikRoute>
              <OwnerTimeSlots />
            </VlasnikRoute>
          }
        />
        <Route
          path="/vlasnik/dashboard"
          element={
            user?.role === "vlasnik" ? (
              <OwnerDashboard />
            ) : (
              <Navigate to="/login" />
            )
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

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

// ============================================
// 404 STRANICA
// ============================================
const NotFound = () => {
  return (
    <div
      className="container"
      style={{ textAlign: "center", padding: "60px 20px" }}
    >
      <h1 style={{ fontSize: "6rem", color: "#ff6b4a" }}>404</h1>
      <h2>Stranica nije pronađena</h2>
      <p>Izvinjavamo se, stranica koju tražite ne postoji.</p>
      <a
        href="/"
        className="btn btn-primary"
        style={{ marginTop: "20px", display: "inline-block" }}
      >
        Vrati se na početnu
      </a>
    </div>
  );
};

export default App;
