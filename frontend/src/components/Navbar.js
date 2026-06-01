import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../styles/Navbar.css";
import {
  validateChangeEmailForm,
  validateChangePasswordForm,
  validateDeleteAccountForm,
} from "../utils/accountValidationUtils";
import {
  createAdminNotification,
  getMyNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  searchAdminPlayroomsForNotifications,
} from "../services/notificationService";

const getRoleLabel = (role = "") => {
  const normalizedRole = String(role || "").toLowerCase();

  if (normalizedRole === "roditelj") return "Roditelj";
  if (normalizedRole === "vlasnik") return "Vlasnik";
  if (normalizedRole === "admin") return "Admin";

  return "-";
};

const formatAccountValue = (value) => {
  const safeValue = String(value || "").trim();

  return safeValue || "-";
};

const getNotificationPriorityLabel = (priority = "") => {
  if (priority === "hitno") return "Hitno";
  if (priority === "vazno") return "Važno";
  return "Info";
};

const formatNotificationDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

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
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const accountDropdownRef = useRef(null);
  const notificationsDropdownRef = useRef(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAllNotifications, setMarkingAllNotifications] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    title: "",
    message: "",
    targetType: "role",
    targetRole: "vlasnik",
    targetPlayroomId: "",
    priority: "info",
  });

  const [playroomSearch, setPlayroomSearch] = useState("");
  const [playroomResults, setPlayroomResults] = useState([]);
  const [selectedNotificationPlayroom, setSelectedNotificationPlayroom] =
    useState(null);
  const [playroomSearchLoading, setPlayroomSearchLoading] = useState(false);

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

  const loadUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    const result = await getUnreadNotificationCount();

    if (result?.success) {
      setUnreadCount(result.unreadCount || 0);
    }
  }, [isAuthenticated]);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    setNotificationsLoading(true);
    setNotificationsError("");

    const result = await getMyNotifications({
      page: 1,
      limit: 5,
    });

    if (result?.success) {
      setNotifications(Array.isArray(result.data) ? result.data : []);
    } else {
      setNotifications([]);
      setNotificationsError(
        result?.error || "Greška pri učitavanju obaveštenja.",
      );
    }

    setNotificationsLoading(false);
  }, [isAuthenticated]);

  const toggleNotifications = async () => {
    const shouldOpen = !notificationsOpen;

    setNotificationsOpen(shouldOpen);
    setAccountOpen(false);

    if (!shouldOpen) return;

    await loadNotifications();

    if (unreadCount > 0 && !markingAllNotifications) {
      setMarkingAllNotifications(true);

      const result = await markAllNotificationsAsRead();

      if (result?.success) {
        setUnreadCount(0);

        setNotifications((prev) =>
          prev.map((notification) => ({
            ...notification,
            read: true,
          })),
        );
      } else {
        await loadUnreadCount();
      }

      setMarkingAllNotifications(false);
      return;
    }

    await loadUnreadCount();
  };

  const openAccountModal = (modalName) => {
    setActiveModal(modalName);
    setAccountOpen(false);
    setFormError("");
    setSubmitting(false);

    closeMenu();
  };

  const closeAccountModal = () => {
    if (submitting) return;

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
    setNotificationForm({
      title: "",
      message: "",
      targetType: "role",
      targetRole: "vlasnik",
      targetPlayroomId: "",
      priority: "info",
    });
    setPlayroomSearch("");
    setPlayroomResults([]);
    setSelectedNotificationPlayroom(null);
    setPlayroomSearchLoading(false);
    setShowPasswordFields({
      currentPassword: false,
      newPassword: false,
      confirmNewPassword: false,
      emailCurrentPassword: false,
      deleteCurrentPassword: false,
    });
  };

  const openLogoutConfirm = () => {
    setLogoutConfirmOpen(true);
    setAccountOpen(false);
    closeMenu();
  };

  const closeLogoutConfirm = () => {
    if (loggingOut) return;
    setLogoutConfirmOpen(false);
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await logout();
    } catch (error) {
      console.error("Greška pri odjavi:", error);
    } finally {
      setLoggingOut(false);
      setLogoutConfirmOpen(false);
      navigate("/login", { replace: true });
      closeMenu();
      setNotificationsOpen(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setNotificationsOpen(false);
      return;
    }

    loadUnreadCount();
  }, [isAuthenticated, user?._id, loadUnreadCount]);

  useEffect(() => {
    if (
      activeModal !== "notifications" ||
      user?.role !== "admin" ||
      notificationForm.targetType !== "playroom"
    ) {
      setPlayroomResults([]);
      setPlayroomSearchLoading(false);
      return;
    }

    const safeSearch = playroomSearch.trim();

    if (safeSearch.length < 2) {
      setPlayroomResults([]);
      setPlayroomSearchLoading(false);
      return;
    }

    if (
      selectedNotificationPlayroom &&
      safeSearch ===
        `${selectedNotificationPlayroom.naziv} · ${selectedNotificationPlayroom.grad}`
    ) {
      setPlayroomResults([]);
      setPlayroomSearchLoading(false);
      return;
    }

    let cancelled = false;

    const timeoutId = setTimeout(async () => {
      setPlayroomSearchLoading(true);

      const result = await searchAdminPlayroomsForNotifications(safeSearch, 10);

      if (!cancelled) {
        setPlayroomResults(result?.success ? result.data || [] : []);
        setPlayroomSearchLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [
    activeModal,
    user?.role,
    notificationForm.targetType,
    playroomSearch,
    selectedNotificationPlayroom,
  ]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(event.target)
      ) {
        setAccountOpen(false);
      }

      if (
        notificationsDropdownRef.current &&
        !notificationsDropdownRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
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

                {user?.role !== "admin" && (
                  <div
                    className="navbar-notifications"
                    ref={notificationsDropdownRef}
                  >
                    <button
                      type="button"
                      className="notification-bell-btn"
                      onClick={toggleNotifications}
                      aria-expanded={notificationsOpen}
                      aria-controls="notifications-dropdown"
                      aria-label={`Obaveštenja${unreadCount > 0 ? `, nepročitano ${unreadCount}` : ""}`}
                    >
                      🔔
                      {unreadCount > 0 && (
                        <span className="notification-badge">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </button>

                    {notificationsOpen && (
                      <div
                        id="notifications-dropdown"
                        className="notifications-dropdown"
                      >
                        <div className="notifications-dropdown-header">
                          <strong>Obaveštenja</strong>
                        </div>

                        {notificationsLoading ? (
                          <p className="notifications-state">Učitavanje...</p>
                        ) : notificationsError ? (
                          <p className="notifications-error">
                            {notificationsError}
                          </p>
                        ) : notifications.length === 0 ? (
                          <p className="notifications-state">
                            Nema obaveštenja.
                          </p>
                        ) : (
                          <div className="notifications-list">
                            {notifications.map((notification) => (
                              <div
                                key={notification._id}
                                className={`notification-item ${
                                  notification.read ? "read" : "unread"
                                } priority-${notification.priority || "info"}`}
                              >
                                <div className="notification-item-top">
                                  <span>
                                    {getNotificationPriorityLabel(
                                      notification.priority,
                                    )}
                                  </span>
                                  <small>
                                    {formatNotificationDate(
                                      notification.publishedAt,
                                    )}
                                  </small>
                                </div>

                                <h4>{notification.title}</h4>
                                <p>{notification.message}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="navbar-user" ref={accountDropdownRef}>
                  <button
                    type="button"
                    className="navbar-user-name"
                    onClick={() => setAccountOpen((prev) => !prev)}
                    aria-expanded={accountOpen}
                    aria-controls="account-dropdown"
                  >
                    👤{" "}
                    {user?.ime
                      ? `${user.ime}${user?.prezime ? ` ${user.prezime}` : ""}`
                      : user?.email || "Korisnik"}{" "}
                    ▾
                  </button>

                  {accountOpen && (
                    <div id="account-dropdown" className="account-dropdown">
                      <button
                        type="button"
                        onClick={() => openAccountModal("profile")}
                      >
                        👤 Lični podaci
                      </button>

                      {user?.role === "admin" && (
                        <button
                          type="button"
                          onClick={() => openAccountModal("notifications")}
                        >
                          🔔 Notifikacije
                        </button>
                      )}

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
                  onClick={openLogoutConfirm}
                  className="logout-btn"
                >
                  🚪 Odjava
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {menuOpen && (
        <button
          type="button"
          className="navbar-mobile-backdrop"
          aria-label="Zatvori meni"
          onClick={closeMenu}
        />
      )}

      {logoutConfirmOpen && (
        <div className="logout-confirm-overlay" onClick={closeLogoutConfirm}>
          <div
            className="logout-confirm-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Potvrda odjave"
          >
            <h2>Odjava</h2>

            <p>Da li ste sigurni da želite da se odjavite?</p>

            <div className="logout-confirm-actions">
              <button
                type="button"
                className="logout-cancel-btn"
                onClick={closeLogoutConfirm}
                disabled={loggingOut}
              >
                Ne, ostani prijavljen
              </button>

              <button
                type="button"
                className="logout-confirm-btn"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? "Odjavljujem..." : "Da, odjavi me"}
              </button>
            </div>
          </div>
        </div>
      )}
      {activeModal && (
        <div className="account-modal-overlay" onClick={closeAccountModal}>
          <div
            className="account-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={
              activeModal === "profile"
                ? "Lični podaci"
                : activeModal === "notifications"
                  ? "Slanje notifikacije"
                  : activeModal === "password"
                    ? "Promena lozinke"
                    : activeModal === "email"
                      ? "Promena emaila"
                      : "Brisanje profila"
            }
          >
            <button
              type="button"
              className="account-modal-close"
              onClick={closeAccountModal}
              aria-label="Zatvori modal"
              disabled={submitting}
            >
              ✖
            </button>

            {/* LIČNI PODACI */}
            {activeModal === "profile" && (
              <>
                <h2>Lični podaci</h2>

                <div className="account-profile-details">
                  <div className="account-profile-row">
                    <span>Ime</span>
                    <strong>{formatAccountValue(user?.ime)}</strong>
                  </div>

                  <div className="account-profile-row">
                    <span>Prezime</span>
                    <strong>{formatAccountValue(user?.prezime)}</strong>
                  </div>

                  <div className="account-profile-row">
                    <span>Email</span>
                    <strong>{formatAccountValue(user?.email)}</strong>
                  </div>

                  <div className="account-profile-row">
                    <span>Telefon</span>
                    <strong>{formatAccountValue(user?.telefon)}</strong>
                  </div>

                  <div className="account-profile-row">
                    <span>Uloga</span>
                    <strong>{getRoleLabel(user?.role)}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="account-submit-btn account-profile-close-btn"
                  onClick={closeAccountModal}
                >
                  Zatvori
                </button>
              </>
            )}

            {/* ADMIN NOTIFIKACIJE */}
            {activeModal === "notifications" && user?.role === "admin" && (
              <>
                <h2>Slanje notifikacije</h2>

                <form
                  className="account-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (submitting) return;

                    setFormError("");

                    const title = notificationForm.title.trim();
                    const message = notificationForm.message.trim();

                    if (title.length < 3) {
                      setFormError("Naslov mora imati najmanje 3 karaktera.");
                      return;
                    }

                    if (message.length < 5) {
                      setFormError(
                        "Tekst obaveštenja mora imati najmanje 5 karaktera.",
                      );
                      return;
                    }

                    if (
                      notificationForm.targetType === "playroom" &&
                      !notificationForm.targetPlayroomId
                    ) {
                      setFormError("Izaberite konkretnu igraonicu.");
                      return;
                    }

                    setSubmitting(true);

                    const result = await createAdminNotification({
                      title,
                      message,
                      targetType: notificationForm.targetType,
                      targetRole: notificationForm.targetRole,
                      targetPlayroomId: notificationForm.targetPlayroomId,
                      priority: notificationForm.priority,
                    });

                    setSubmitting(false);

                    if (result?.success) {
                      showToast("Notifikacija je uspešno poslata.", "success");

                      setNotificationForm({
                        title: "",
                        message: "",
                        targetType: "role",
                        targetRole: "vlasnik",
                        targetPlayroomId: "",
                        priority: "info",
                      });
                      setPlayroomSearch("");
                      setPlayroomResults([]);
                      setSelectedNotificationPlayroom(null);

                      setTimeout(() => {
                        closeAccountModal();
                      }, 800);
                    } else {
                      setFormError(
                        result?.error || "Slanje notifikacije nije uspelo.",
                      );
                    }
                  }}
                >
                  <input
                    type="text"
                    placeholder="Naslov obaveštenja"
                    value={notificationForm.title}
                    maxLength={120}
                    onChange={(e) =>
                      setNotificationForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    required
                  />

                  <textarea
                    className="account-notification-textarea"
                    placeholder="Tekst obaveštenja"
                    value={notificationForm.message}
                    maxLength={3000}
                    rows="6"
                    onChange={(e) =>
                      setNotificationForm((prev) => ({
                        ...prev,
                        message: e.target.value,
                      }))
                    }
                    required
                  />

                  <select
                    value={
                      notificationForm.targetType === "playroom"
                        ? "playroom"
                        : notificationForm.targetRole
                    }
                    onChange={(e) => {
                      const value = e.target.value;

                      if (value === "playroom") {
                        setNotificationForm((prev) => ({
                          ...prev,
                          targetType: "playroom",
                          targetRole: "vlasnik",
                          targetPlayroomId: "",
                        }));
                        setPlayroomSearch("");
                        setPlayroomResults([]);
                        setSelectedNotificationPlayroom(null);
                        return;
                      }

                      setNotificationForm((prev) => ({
                        ...prev,
                        targetType: "role",
                        targetRole: value,
                        targetPlayroomId: "",
                      }));
                      setPlayroomSearch("");
                      setPlayroomResults([]);
                      setSelectedNotificationPlayroom(null);
                    }}
                  >
                    <option value="vlasnik">Svi vlasnici</option>
                    <option value="roditelj">Svi roditelji</option>
                    <option value="svi">Vlasnici i roditelji</option>
                    <option value="playroom">Igraonica</option>
                  </select>

                  {notificationForm.targetType === "playroom" && (
                    <div className="account-playroom-search-box">
                      <input
                        type="text"
                        placeholder="Pretraži igraonicu po nazivu, gradu ili adresi"
                        value={playroomSearch}
                        onChange={(e) => {
                          setPlayroomSearch(e.target.value);
                          setNotificationForm((prev) => ({
                            ...prev,
                            targetPlayroomId: "",
                          }));
                          setSelectedNotificationPlayroom(null);
                        }}
                      />

                      {playroomSearch.trim().length > 0 &&
                        playroomSearch.trim().length < 2 && (
                          <p className="account-field-hint">
                            Unesite najmanje 2 karaktera za pretragu.
                          </p>
                        )}

                      {playroomSearchLoading && (
                        <p className="account-field-hint">
                          Pretražujem igraonice...
                        </p>
                      )}

                      {selectedNotificationPlayroom && (
                        <div className="selected-playroom-notification">
                          Izabrano:{" "}
                          <strong>
                            {selectedNotificationPlayroom.naziv} ·{" "}
                            {selectedNotificationPlayroom.grad}
                          </strong>
                        </div>
                      )}

                      {playroomResults.length > 0 && (
                        <div className="playroom-search-results">
                          {playroomResults.map((playroom) => (
                            <button
                              type="button"
                              key={playroom._id}
                              className="playroom-search-result"
                              onClick={() => {
                                setNotificationForm((prev) => ({
                                  ...prev,
                                  targetPlayroomId: playroom._id,
                                }));
                                setSelectedNotificationPlayroom(playroom);
                                setPlayroomResults([]);
                                setPlayroomSearch(
                                  `${playroom.naziv} · ${playroom.grad}`,
                                );
                              }}
                            >
                              <strong>{playroom.naziv}</strong>
                              <span>
                                {playroom.grad || "-"} ·{" "}
                                {playroom.adresa || "-"}
                              </span>
                              <small>
                                Vlasnik: {playroom.vlasnikId?.ime || "-"}{" "}
                                {playroom.vlasnikId?.prezime || ""}
                              </small>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <select
                    value={notificationForm.priority}
                    onChange={(e) =>
                      setNotificationForm((prev) => ({
                        ...prev,
                        priority: e.target.value,
                      }))
                    }
                  >
                    <option value="info">Info</option>
                    <option value="vazno">Važno</option>
                    <option value="hitno">Hitno</option>
                  </select>

                  {formError && (
                    <div className="account-error" role="alert">
                      {formError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className={`account-submit-btn ${submitting ? "loading" : ""}`}
                    disabled={submitting}
                  >
                    {submitting ? "Šaljem..." : "Pošalji notifikaciju"}
                  </button>
                </form>
              </>
            )}

            {/* PROMENA LOZINKE */}
            {activeModal === "password" && (
              <>
                <h2>Promena lozinke</h2>

                <form
                  className="account-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (submitting) return;

                    setFormError("");

                    const validation = validateChangePasswordForm(passwordForm);

                    if (!validation.success) {
                      setFormError(validation.error);
                      return;
                    }

                    setSubmitting(true);

                    const result = await changePassword(passwordForm);

                    setSubmitting(false);

                    if (result.success) {
                      showToast("Lozinka je uspešno promenjena.", "success");

                      setTimeout(() => {
                        closeAccountModal();
                        navigate("/login", { replace: true });
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
                      aria-label={
                        showPasswordFields.currentPassword
                          ? "Sakrij trenutnu lozinku"
                          : "Prikaži trenutnu lozinku"
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
                      aria-label={
                        showPasswordFields.newPassword
                          ? "Sakrij novu lozinku"
                          : "Prikaži novu lozinku"
                      }
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
                      aria-label={
                        showPasswordFields.confirmNewPassword
                          ? "Sakrij potvrdu nove lozinke"
                          : "Prikaži potvrdu nove lozinke"
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
                    <div className="account-error" role="alert">
                      {formError}
                    </div>
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
                    if (submitting) return;

                    setFormError("");

                    const validation = validateChangeEmailForm(emailForm);

                    if (!validation.success) {
                      setFormError(validation.error);
                      return;
                    }

                    setSubmitting(true);

                    const result = await changeEmail(validation.value);

                    setSubmitting(false);

                    if (result.success) {
                      showToast("Email je uspešno promenjen.", "success");

                      setTimeout(() => {
                        closeAccountModal();
                        navigate("/login", { replace: true });
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
                      aria-label={
                        showPasswordFields.emailCurrentPassword
                          ? "Sakrij trenutnu lozinku"
                          : "Prikaži trenutnu lozinku"
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
                    <div className="account-error" role="alert">
                      {formError}
                    </div>
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
                    if (submitting) return;

                    setFormError("");

                    const validation = validateDeleteAccountForm(deleteForm);

                    if (!validation.success) {
                      setFormError(validation.error);
                      return;
                    }

                    setSubmitting(true);

                    const result = await deleteAccount(deleteForm);

                    setSubmitting(false);

                    if (result.success) {
                      showToast("Profil je uspešno obrisan.", "success");

                      setTimeout(() => {
                        closeAccountModal();
                        navigate("/login", { replace: true });
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
                      aria-label={
                        showPasswordFields.deleteCurrentPassword
                          ? "Sakrij trenutnu lozinku"
                          : "Prikaži trenutnu lozinku"
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
                    <div className="account-error" role="alert">
                      {formError}
                    </div>
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
