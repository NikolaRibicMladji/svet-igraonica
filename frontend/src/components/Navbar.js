import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../styles/Navbar.css";

const Navbar = () => {
  const {
    user,
    isAuthenticated,
    logout,
    changePassword,
    changeEmail,
    deleteAccount,
  } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [formError, setFormError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const accountDropdownRef = useRef(null);
  const [showPasswordFields, setShowPasswordFields] = useState({
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false,
    emailCurrentPassword: false,
    deleteCurrentPassword: false,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [emailForm, setEmailForm] = useState({
    currentPassword: "",
    newEmail: "",
  });

  const [deleteForm, setDeleteForm] = useState({
    currentPassword: "",
  });

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswordFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const openAccountModal = (modalName) => {
    setActiveModal(modalName);
    setAccountOpen(false);
    setFormError("");
    setSubmitting(false);

    closeMenu();
  };

  const closeAccountModal = () => {
    setActiveModal(null);
    setFormError("");
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    setEmailForm({
      currentPassword: "",
      newEmail: "",
    });
    setDeleteForm({
      currentPassword: "",
    });
    setShowPasswordFields({
      currentPassword: false,
      newPassword: false,
      confirmNewPassword: false,
      emailCurrentPassword: false,
      deleteCurrentPassword: false,
    });
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(event.target)
      ) {
        setAccountOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
    <>
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
                <Link
                  to="/register"
                  className="btn-register"
                  onClick={closeMenu}
                >
                  📝 Registracija
                </Link>
              </div>
            ) : (
              <>
                {renderAuthenticatedLinks()}

                <div className="navbar-user" ref={accountDropdownRef}>
                  <button
                    type="button"
                    className="navbar-user-name"
                    onClick={() => setAccountOpen((prev) => !prev)}
                  >
                    👤{" "}
                    {user?.ime
                      ? `${user.ime}${user?.prezime ? ` ${user.prezime}` : ""}`
                      : user?.email || "Korisnik"}{" "}
                    ▾
                  </button>

                  {accountOpen && (
                    <div className="account-dropdown">
                      <button
                        type="button"
                        onClick={() => openAccountModal("password")}
                      >
                        🔒 Promeni lozinku
                      </button>

                      <button
                        type="button"
                        onClick={() => openAccountModal("email")}
                      >
                        📧 Promeni email
                      </button>

                      <button
                        type="button"
                        className="danger"
                        onClick={() => openAccountModal("delete")}
                      >
                        🗑️ Obriši profil
                      </button>
                    </div>
                  )}
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
      {activeModal && (
        <div className="account-modal-overlay" onClick={closeAccountModal}>
          <div className="account-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="account-modal-close"
              onClick={closeAccountModal}
            >
              ✖
            </button>

            {/* PROMENA LOZINKE */}
            {activeModal === "password" && (
              <>
                <h2>Promena lozinke</h2>

                <form
                  className="account-form"
                  onSubmit={async (e) => {
                    e.preventDefault();

                    setFormError("");
                    setSubmitting(true);

                    const result = await changePassword(passwordForm);

                    setSubmitting(false);

                    if (result.success) {
                      showToast("Lozinka je uspešno promenjena.", "success");

                      setTimeout(() => {
                        closeAccountModal();
                        navigate("/login");
                      }, 1200);
                    } else {
                      setFormError(result.error);
                    }
                  }}
                >
                  <div className="account-password-field">
                    <input
                      type={
                        showPasswordFields.currentPassword ? "text" : "password"
                      }
                      placeholder="Trenutna lozinka"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }))
                      }
                      required
                    />

                    <button
                      type="button"
                      className="account-eye-btn"
                      onClick={() =>
                        togglePasswordVisibility("currentPassword")
                      }
                    >
                      {showPasswordFields.currentPassword ? (
                        <FaEyeSlash />
                      ) : (
                        <FaEye />
                      )}
                    </button>
                  </div>

                  <div className="account-password-field">
                    <input
                      type={
                        showPasswordFields.newPassword ? "text" : "password"
                      }
                      placeholder="Nova lozinka"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      required
                    />

                    <button
                      type="button"
                      className="account-eye-btn"
                      onClick={() => togglePasswordVisibility("newPassword")}
                    >
                      {showPasswordFields.newPassword ? (
                        <FaEyeSlash />
                      ) : (
                        <FaEye />
                      )}
                    </button>
                  </div>

                  <div className="account-password-field">
                    <input
                      type={
                        showPasswordFields.confirmNewPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="Potvrda nove lozinke"
                      value={passwordForm.confirmNewPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          confirmNewPassword: e.target.value,
                        }))
                      }
                      required
                    />

                    <button
                      type="button"
                      className="account-eye-btn"
                      onClick={() =>
                        togglePasswordVisibility("confirmNewPassword")
                      }
                    >
                      {showPasswordFields.confirmNewPassword ? (
                        <FaEyeSlash />
                      ) : (
                        <FaEye />
                      )}
                    </button>
                  </div>

                  {formError && (
                    <div className="account-error">{formError}</div>
                  )}

                  <button
                    type="submit"
                    className={`account-submit-btn ${
                      submitting ? "loading" : ""
                    }`}
                    disabled={submitting}
                  >
                    {submitting ? "Čuvanje..." : "Promeni lozinku"}
                  </button>
                </form>
              </>
            )}

            {/* PROMENA EMAILA */}
            {activeModal === "email" && (
              <>
                <h2>Promena emaila</h2>

                <form
                  className="account-form"
                  onSubmit={async (e) => {
                    e.preventDefault();

                    setFormError("");
                    setSubmitting(true);

                    const result = await changeEmail(emailForm);

                    setSubmitting(false);

                    if (result.success) {
                      showToast("Email je uspešno promenjen.", "success");

                      setTimeout(() => {
                        closeAccountModal();
                        navigate("/login");
                      }, 1200);
                    } else {
                      setFormError(result.error);
                    }
                  }}
                >
                  <input
                    type="email"
                    placeholder="Nova email adresa"
                    value={emailForm.newEmail}
                    onChange={(e) =>
                      setEmailForm((prev) => ({
                        ...prev,
                        newEmail: e.target.value,
                      }))
                    }
                    required
                  />

                  <div className="account-password-field">
                    <input
                      type={
                        showPasswordFields.emailCurrentPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="Trenutna lozinka"
                      value={emailForm.currentPassword}
                      onChange={(e) =>
                        setEmailForm((prev) => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }))
                      }
                      required
                    />

                    <button
                      type="button"
                      className="account-eye-btn"
                      onClick={() =>
                        togglePasswordVisibility("emailCurrentPassword")
                      }
                    >
                      {showPasswordFields.emailCurrentPassword ? (
                        <FaEyeSlash />
                      ) : (
                        <FaEye />
                      )}
                    </button>
                  </div>

                  {formError && (
                    <div className="account-error">{formError}</div>
                  )}

                  <button
                    type="submit"
                    className={`account-submit-btn ${
                      submitting ? "loading" : ""
                    }`}
                    disabled={submitting}
                  >
                    {submitting ? "Čuvanje..." : "Promeni email"}
                  </button>
                </form>
              </>
            )}

            {/* BRISANJE NALOGA */}
            {activeModal === "delete" && (
              <>
                <h2>Brisanje profila</h2>

                <p className="account-warning">
                  Ova akcija je trajna i ne može se poništiti.
                </p>

                <form
                  className="account-form"
                  onSubmit={async (e) => {
                    e.preventDefault();

                    setFormError("");
                    setSubmitting(true);

                    const result = await deleteAccount(deleteForm);

                    setSubmitting(false);

                    if (result.success) {
                      showToast("Profil je uspešno obrisan.", "success");

                      setTimeout(async () => {
                        await logout();
                        closeAccountModal();
                        navigate("/");
                      }, 1200);
                    } else {
                      setFormError(result.error);
                    }
                  }}
                >
                  <div className="account-password-field">
                    <input
                      type={
                        showPasswordFields.deleteCurrentPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="Trenutna lozinka"
                      value={deleteForm.currentPassword}
                      onChange={(e) =>
                        setDeleteForm({
                          currentPassword: e.target.value,
                        })
                      }
                      required
                    />

                    <button
                      type="button"
                      className="account-eye-btn"
                      onClick={() =>
                        togglePasswordVisibility("deleteCurrentPassword")
                      }
                    >
                      {showPasswordFields.deleteCurrentPassword ? (
                        <FaEyeSlash />
                      ) : (
                        <FaEye />
                      )}
                    </button>
                  </div>

                  {formError && (
                    <div className="account-error">{formError}</div>
                  )}

                  <button
                    type="submit"
                    className={`account-submit-btn danger ${submitting ? "loading" : ""}`}
                    disabled={submitting}
                  >
                    {submitting ? "Brisanje..." : "Obriši profil"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
