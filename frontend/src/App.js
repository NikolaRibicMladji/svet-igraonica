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
import ManagePlayroom from "./pages/ManagePlayroom"; // NOVA STRANICA
import AdminPanel from "./pages/AdminPanel";
import PlayroomDetails from "./pages/PlayroomDetails";
import Book from "./pages/Book";
import MyBookings from "./pages/MyBookings";
import ManageTimeSlots from "./pages/ManageTimeSlots";
import OwnerTimeSlots from "./pages/OwnerTimeSlots";
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
function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <Routes>
          {/* ========== JAVNE RUTE - SVAKO MOŽE ========== */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/playrooms" element={<Playrooms />} />
          <Route path="/playrooms/:id" element={<PlayroomDetails />} />

          {/* ========== RODITELJ RUTE ========== */}
          <Route
            path="/book/:id"
            element={
              <RoditeljRoute>
                <Book />
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

          {/* ========== VLASNIK RUTE ========== */}
          {/* Ako vlasnik nema igraonicu → ide na create-playroom */}
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

          {/* ========== ADMIN RUTE ========== */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />

          {/* ========== 404 - STRANICA NIJE PRONAĐENA ========== */}
          <Route path="*" element={<NotFound />} />
        </Routes>
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
