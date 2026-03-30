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

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          🎈 SvetIgraonica
        </Link>

        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`navbar-links ${menuOpen ? "open" : ""}`}>
          {/* JAVNI LINKOVI */}
          <Link to="/" onClick={closeMenu}>
            🏠 Početna
          </Link>
          <Link to="/playrooms" onClick={closeMenu}>
            🎯 Igraonice
          </Link>

          {!isAuthenticated ? (
            <div className="auth-links">
              <Link to="/login" className="btn-login" onClick={closeMenu}>
                🔑 Prijava
              </Link>
              <Link to="/register" className="btn-register" onClick={closeMenu}>
                📝 Registracija
              </Link>
            </div>
          ) : (
            <>
              {/* RODITELJ */}
              {user?.role === "roditelj" && (
                <Link to="/my-bookings" onClick={closeMenu}>
                  📋 Moje rezervacije
                </Link>
              )}

              {/* VLASNIK */}
              {user?.role === "vlasnik" && (
                <>
                  <Link to="/vlasnik/dashboard" onClick={closeMenu}>
                    📊 Dashboard
                  </Link>
                  <Link to="/manage-playroom" onClick={closeMenu}>
                    🏢 Moja igraonica
                  </Link>
                  <Link to="/manage-slots" onClick={closeMenu}>
                    📅 Upravljanje terminima
                  </Link>
                </>
              )}

              {/* ADMIN */}
              {user?.role === "admin" && (
                <>
                  <Link to="/admin" onClick={closeMenu}>
                    ⚙️ Admin panel
                  </Link>
                  <Link to="/all-playrooms" onClick={closeMenu}>
                    🏢 Sve igraonice
                  </Link>
                </>
              )}

              <button onClick={handleLogout} className="logout-btn">
                🚪 Odjava
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
