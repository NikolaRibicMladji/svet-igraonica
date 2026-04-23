import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Navbar.css";

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Greška pri odjavi:", error);
    } finally {
      navigate("/login");
      closeMenu();
    }
  };

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const renderAuthenticatedLinks = () => {
    if (user?.role === "roditelj") {
      return (
        <Link to="/my-bookings" onClick={closeMenu}>
          📋 Moje rezervacije
        </Link>
      );
    }

    if (user?.role === "vlasnik") {
      return (
        <>
          <Link to="/owner/dashboard" onClick={closeMenu}>
            📊 Analitika
          </Link>
          <Link to="/manage-playroom" onClick={closeMenu}>
            🏢 Moja igraonica
          </Link>
          <Link to="/owner/timeslots" onClick={closeMenu}>
            📅 Upravljanje terminima
          </Link>
        </>
      );
    }

    if (user?.role === "admin") {
      return (
        <>
          <Link to="/admin" onClick={closeMenu}>
            ⚙️ Admin panel
          </Link>
        </>
      );
    }

    return null;
  };

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          🎈 Svet Igraonica
        </Link>

        <button
          type="button"
          className={`hamburger ${menuOpen ? "open" : ""}`}
          onClick={toggleMenu}
          aria-label={menuOpen ? "Zatvori meni" : "Otvori meni"}
          aria-expanded={menuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`navbar-links ${menuOpen ? "open" : ""}`}>
          <NavLink to="/" onClick={closeMenu}>
            🏠 Početna
          </NavLink>

          <NavLink to="/playrooms" onClick={closeMenu}>
            🎯 Igraonice
          </NavLink>

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
              {renderAuthenticatedLinks()}

              <div className="navbar-user">
                <span className="navbar-user-name">
                  👤{" "}
                  {user?.ime
                    ? `${user.ime}${user?.prezime ? ` ${user.prezime}` : ""}`
                    : user?.email || "Korisnik"}
                </span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="logout-btn"
              >
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
