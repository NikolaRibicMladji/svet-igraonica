import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Navbar.css";

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link to="/" className="navbar-logo" onClick={() => setMenuOpen(false)}>
          🎈 SvetIgraonica
        </Link>

        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`navbar-links ${menuOpen ? "open" : ""}`}>
          <Link to="/" onClick={() => setMenuOpen(false)}>
            Početna
          </Link>
          <Link to="/playrooms" onClick={() => setMenuOpen(false)}>
            Igraonice
          </Link>

          {isAuthenticated ? (
            <>
              <div className="user-menu">
                <span className="user-name">👋 {user?.ime}</span>
                {user?.role === "roditelj" && (
                  <Link to="/my-bookings" onClick={() => setMenuOpen(false)}>
                    Moje rezervacije
                  </Link>
                )}
                {user?.role === "vlasnik" && (
                  <>
                    <Link to="/my-playrooms">Moje igraonice</Link>
                    <Link to="/owner-slots">📅 Pregled termina</Link>
                    <Link to="/manage-slots">➕ Upravljanje terminima</Link>
                    <Link to="/create-playroom">✨ Dodaj igraonicu</Link>
                  </>
                )}
                {user?.role === "admin" && (
                  <Link to="/admin" onClick={() => setMenuOpen(false)}>
                    Admin panel
                  </Link>
                )}
                <button onClick={handleLogout} className="logout-link">
                  Odjava
                </button>
              </div>
            </>
          ) : (
            <div className="auth-links">
              <Link to="/login" className="btn-login">
                Prijava
              </Link>
              <Link to="/register" className="btn-register">
                Registracija
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
