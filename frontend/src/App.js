import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Playrooms from "./pages/Playrooms";
import CreatePlayroom from "./pages/CreatePlayroom";
import MyPlayrooms from "./pages/MyPlayrooms";
import AdminPanel from "./pages/AdminPanel";
import PlayroomDetails from "./pages/PlayroomDetails";
import Book from "./pages/Book";
import MyBookings from "./pages/MyBookings";
import ManageTimeSlots from "./pages/ManageTimeSlots";
import OwnerTimeSlots from "./pages/OwnerTimeSlots";
import "./styles/global.css";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/playrooms" element={<Playrooms />} />
          <Route path="/create-playroom" element={<CreatePlayroom />} />
          <Route path="/my-playrooms" element={<MyPlayrooms />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/playrooms/:id" element={<PlayroomDetails />} />
          <Route path="/book/:id" element={<Book />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/manage-slots" element={<ManageTimeSlots />} />
          <Route path="/owner-slots" element={<OwnerTimeSlots />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
