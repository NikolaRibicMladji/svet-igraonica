import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { getOwnerBookings, confirmBooking } from "../services/bookingService";
import "../styles/OwnerDashboard.css";
import { useToast } from "../context/ToastContext";

const OwnerDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [myPlayrooms, setMyPlayrooms] = useState([]);
  const [selectedPlayroomId, setSelectedPlayroomId] = useState("");
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState("");

  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState("");
  const [showConfirmedModal, setShowConfirmedModal] = useState(false);
  const [showAllBookingsModal, setShowAllBookingsModal] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [expandedOwnerBookingId, setExpandedOwnerBookingId] = useState(null);
  const [showTodayBookingsModal, setShowTodayBookingsModal] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      fetchMyPlayrooms();
      fetchBookings();
    }
  }, [authLoading]);

  useEffect(() => {
    if (selectedPlayroomId) {
      fetchStats(selectedPlayroomId, true);
    } else {
      setStats(null);
    }
  }, [selectedPlayroomId]);

  useEffect(() => {
    if (authLoading) return;

    const interval = setInterval(() => {
      fetchBookings();

      if (selectedPlayroomId) {
        fetchStats(selectedPlayroomId, false);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [authLoading, selectedPlayroomId]);

  const toggleOwnerBookingDetails = (bookingId) => {
    setExpandedOwnerBookingId((prev) =>
      prev === bookingId ? null : bookingId,
    );
  };

  const fetchMyPlayrooms = async () => {
    try {
      setLoading(true);
      setError("");

      const resPlayrooms = await api.get("/playrooms/mine/my-playrooms");
      const playrooms = Array.isArray(resPlayrooms.data?.data)
        ? resPlayrooms.data.data
        : [];

      setMyPlayrooms(playrooms);

      if (playrooms.length > 0) {
        setSelectedPlayroomId(playrooms[0]._id);
      } else {
        setSelectedPlayroomId("");
        setStats(null);
      }
    } catch (err) {
      console.error("Greška pri učitavanju igraonica:", err);
      setError(
        err?.response?.data?.message ||
          "Greška pri učitavanju podataka za dashboard.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (playroomId, showLoader = false) => {
    try {
      if (showLoader) {
        setStatsLoading(true);
      }

      setError("");

      const resStats = await api.get(`/playrooms/${playroomId}/stats`);
      setStats(resStats.data?.data || null);
    } catch (err) {
      console.error("Greška pri učitavanju statistike:", err);
      setError(
        err?.response?.data?.message ||
          "Greška pri učitavanju statistike igraonice.",
      );
      setStats(null);
    } finally {
      if (showLoader) {
        setStatsLoading(false);
      }
    }
  };

  const fetchBookings = async () => {
    try {
      setBookingsLoading(true);

      const res = await getOwnerBookings();

      if (res?.success) {
        setBookings(Array.isArray(res.data) ? res.data : []);
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.error("Greška pri učitavanju rezervacija:", err);
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  const handleConfirm = async (bookingId) => {
    if (confirmingId) return;

    try {
      setConfirmingId(bookingId);
      setError("");

      const res = await confirmBooking(bookingId);

      if (res?.success) {
        toast.success(res.message || "Rezervacija je potvrđena.");
        await fetchBookings();

        if (selectedPlayroomId) {
          await fetchStats(selectedPlayroomId);
        }
      } else {
        toast.error(res?.error || "Greška pri potvrdi rezervacije.");
      }
    } catch (err) {
      const message =
        err?.response?.data?.message || "Greška pri potvrdi rezervacije.";
      toast.error(message);
    } finally {
      setConfirmingId("");
    }
  };

  const getPlayroomId = (booking) =>
    typeof booking.playroomId === "object"
      ? booking.playroomId?._id
      : booking.playroomId;

  const getDurationHours = (od, doVreme) => {
    if (!od || !doVreme) return 1;

    const [h1, m1] = od.split(":").map(Number);
    const [h2, m2] = doVreme.split(":").map(Number);

    const start = h1 * 60 + m1;
    const end = h2 * 60 + m2;

    const diff = end - start;

    if (!Number.isFinite(diff) || diff <= 0) return 1;

    return diff / 60;
  };

  const getItemCalculationText = (item, booking) => {
    if (!item) return "";

    const cena = Number(item.cena) || 0;
    const tip = item.tip || "fiksno";
    const brojDece = Number(booking?.brojDece) || 0;
    const sati = getDurationHours(booking?.vremeOd, booking?.vremeDo);

    if (tip === "po_satu" || tip === "poSatu") {
      const total = cena * sati;
      return `${cena} RSD × ${sati}h = ${total} RSD`;
    }

    if (tip === "po_osobi" || tip === "poOsobi") {
      const total = cena * brojDece;
      return `${cena} RSD × ${brojDece} = ${total} RSD`;
    }

    return `${cena} RSD`;
  };

  const filteredBookings = useMemo(() => {
    if (!selectedPlayroomId) return bookings;

    return bookings.filter((booking) => {
      return getPlayroomId(booking) === selectedPlayroomId;
    });
  }, [bookings, selectedPlayroomId]);

  const now = new Date();

  const allOwnerBookings = useMemo(() => filteredBookings, [filteredBookings]);

  const pendingBookings = useMemo(
    () => filteredBookings.filter((b) => b.status === "cekanje"),
    [filteredBookings],
  );

  const upcomingConfirmedBookings = useMemo(
    () =>
      filteredBookings.filter((b) => {
        if (b.status !== "potvrdjeno") return false;
        if (!b.datum || !b.vremeDo) return false;

        const bookingEnd = new Date(`${b.datum.slice(0, 10)}T${b.vremeDo}:00`);
        return bookingEnd > now;
      }),
    [filteredBookings, now],
  );

  const completedBookings = useMemo(
    () =>
      filteredBookings.filter((b) => {
        if (b.status === "zavrseno") return true;

        if (!b.datum || !b.vremeDo) return false;

        const bookingEnd = new Date(`${b.datum.slice(0, 10)}T${b.vremeDo}:00`);
        return bookingEnd <= now;
      }),
    [filteredBookings, now],
  );

  const todayBookings = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return filteredBookings.filter((b) => {
      if (!b.datum) return false;
      return b.datum.slice(0, 10) === today;
    });
  }, [filteredBookings]);

  const renderOwnerBookingsAccordion = (items = []) => {
    if (!items.length) {
      return (
        <div className="empty-state modal-empty">
          <p>Nema rezervacija.</p>
        </div>
      );
    }

    return (
      <div className="owner-bookings-accordion-list">
        {items.map((booking) => {
          const isExpanded = expandedOwnerBookingId === booking._id;

          const statusText =
            booking.status === "potvrdjeno"
              ? "Potvrđeno"
              : booking.status === "otkazano"
                ? "Otkazano"
                : booking.status === "zavrseno"
                  ? "Završeno"
                  : booking.status === "cekanje"
                    ? "Čeka potvrdu"
                    : booking.status;

          const statusClass =
            booking.status === "potvrdjeno"
              ? "status-confirmed"
              : booking.status === "otkazano"
                ? "status-cancelled"
                : booking.status === "zavrseno"
                  ? "status-completed"
                  : "status-pending";

          return (
            <div key={booking._id} className="owner-booking-card">
              <div
                className="owner-booking-header clickable-header"
                onClick={() => toggleOwnerBookingDetails(booking._id)}
              >
                <div>
                  <h3>
                    {booking.imeRoditelja} {booking.prezimeRoditelja}
                  </h3>
                  <p className="booking-short-info">
                    📅{" "}
                    {booking.datum
                      ? new Date(booking.datum).toLocaleDateString("sr-RS")
                      : "-"}{" "}
                    | ⏰ {booking.vremeOd || "-"} - {booking.vremeDo || "-"}
                  </p>
                </div>

                <div className="booking-header-right">
                  <span className={`status-badge ${statusClass}`}>
                    {statusText}
                  </span>
                  <span className={`arrow ${isExpanded ? "open" : ""}`}>▼</span>
                </div>
              </div>

              {isExpanded && (
                <div className="owner-booking-details">
                  <p>📧 {booking.emailRoditelja || "-"}</p>
                  <p>📞 {booking.telefonRoditelja || booking.telefon || "-"}</p>
                  <p>
                    📅{" "}
                    {booking.datum
                      ? new Date(booking.datum).toLocaleDateString("sr-RS")
                      : "-"}
                  </p>
                  <p>
                    ⏰ {booking.vremeOd || "-"} - {booking.vremeDo || "-"}
                  </p>
                  <p>👶 Broj dece: {booking.brojDece ?? 0}</p>
                  <p>👨‍👩‍👧 Broj roditelja: {booking.brojRoditelja ?? 0}</p>
                  <p>💰 Ukupna cena: {booking.ukupnaCena ?? 0} RSD</p>

                  {Array.isArray(booking.izabraneCene) &&
                    booking.izabraneCene.length > 0 && (
                      <div className="booking-selected-items">
                        <p>
                          <strong>Izabrane stavke:</strong>
                        </p>
                        {booking.izabraneCene.map((item, idx) => (
                          <p key={`owner-cena-${idx}`}>
                            • {item.naziv} ({item.tip || "fiksno"}) -{" "}
                            {getItemCalculationText(item, booking)}
                            {item.opis && <span> - {item.opis}</span>}
                          </p>
                        ))}
                      </div>
                    )}

                  {booking.izabraniPaket?.naziv && (
                    <div className="booking-selected-items">
                      <p>
                        <strong>Paket:</strong> {booking.izabraniPaket.naziv} (
                        {booking.izabraniPaket.tip || "fiksno"}) -{" "}
                        {getItemCalculationText(booking.izabraniPaket, booking)}
                      </p>

                      {booking.izabraniPaket.opis && (
                        <p>- {booking.izabraniPaket.opis}</p>
                      )}
                    </div>
                  )}

                  {Array.isArray(booking.izabraneUsluge) &&
                    booking.izabraneUsluge.length > 0 && (
                      <div className="booking-selected-items">
                        <p>
                          <strong>Dodatne usluge:</strong>
                        </p>
                        {booking.izabraneUsluge.map((item, idx) => (
                          <p key={`owner-usluga-${idx}`}>
                            • {item.naziv} ({item.tip || "fiksno"}) -{" "}
                            {getItemCalculationText(item, booking)}
                            {item.opis && <span> - {item.opis}</span>}
                          </p>
                        ))}
                      </div>
                    )}

                  {booking.napomena && <p>📝 Napomena: {booking.napomena}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (authLoading || loading) {
    return <div className="loading-container">⏳ Učitavanje podataka...</div>;
  }

  if (user?.role !== "vlasnik" && user?.role !== "admin") {
    return (
      <div className="dashboard-container">
        <div className="error-message">
          Ova stranica je dostupna samo vlasnicima igraonica.
        </div>
      </div>
    );
  }

  if (error && myPlayrooms.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (myPlayrooms.length === 0) {
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h2>Zdravo, {user?.ime || "vlasniče"} 👋</h2>
        </header>

        <div className="empty-state">
          <p>Još nemate kreiranu nijednu igraonicu.</p>
          <p>Prvo kreirajte svoju igraonicu da biste videli statistiku.</p>
        </div>
      </div>
    );
  }

  const selectedPlayroom =
    myPlayrooms.find((playroom) => playroom._id === selectedPlayroomId) ||
    myPlayrooms[0];

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h2>Zdravo, {user?.ime || "vlasniče"} 👋</h2>
        <p className="playroom-name">
          📍{" "}
          {stats?.playroomName || selectedPlayroom?.naziv || "Moja igraonica"}
        </p>
      </header>

      {myPlayrooms.length > 1 && (
        <div className="dashboard-playroom-select">
          <label htmlFor="dashboard-playroom-select">
            Izaberite igraonicu:
          </label>
          <select
            id="dashboard-playroom-select"
            value={selectedPlayroomId}
            onChange={(e) => setSelectedPlayroomId(e.target.value)}
          >
            {myPlayrooms.map((playroom) => (
              <option key={playroom._id} value={playroom._id}>
                {playroom.naziv}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {statsLoading ? (
        <div className="loading-container">⏳ Učitavanje statistike...</div>
      ) : (
        <div className="stats-grid">
          <div
            className="stat-card blue clickable"
            onClick={() => setShowAllBookingsModal(true)}
          >
            <span className="stat-icon">📊</span>
            <div className="stat-info">
              <h3>{stats?.totalBookings ?? 0}</h3>
              <p>Ukupno rezervacija</p>
            </div>
          </div>

          <div
            className="stat-card green clickable"
            onClick={() => setShowConfirmedModal(true)}
          >
            <span className="stat-icon">✅</span>
            <div className="stat-info">
              <h3>{upcomingConfirmedBookings.length}</h3>
              <p>Potvrđene rezervacije</p>
            </div>
          </div>

          <div
            className="stat-card orange clickable"
            onClick={() => setShowCompletedModal(true)}
          >
            <span className="stat-icon">🎉</span>
            <div className="stat-info">
              <h3>{completedBookings.length}</h3>
              <p>Završene rezervacije</p>
            </div>
          </div>
          <div
            className="stat-card purple clickable"
            onClick={() => setShowTodayBookingsModal(true)}
          >
            <span className="stat-icon">📅</span>
            <div className="stat-info">
              <h3>{todayBookings.length}</h3>
              <p>Današnje rezervacije</p>
            </div>
          </div>
        </div>
      )}

      {showAllBookingsModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowAllBookingsModal(false);
            setExpandedOwnerBookingId(null);
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header sticky-modal-header">
              <h3>📊 Sve rezervacije</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => {
                  setShowAllBookingsModal(false);
                  setExpandedOwnerBookingId(null);
                }}
              >
                ✖
              </button>
            </div>

            {renderOwnerBookingsAccordion(allOwnerBookings)}
          </div>
        </div>
      )}
      {showTodayBookingsModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowTodayBookingsModal(false);
            setExpandedOwnerBookingId(null);
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header sticky-modal-header">
              <h3>📅 Današnje rezervacije</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => {
                  setShowTodayBookingsModal(false);
                  setExpandedOwnerBookingId(null);
                }}
              >
                ✖
              </button>
            </div>

            {renderOwnerBookingsAccordion(todayBookings)}
          </div>
        </div>
      )}

      {showCompletedModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowCompletedModal(false);
            setExpandedOwnerBookingId(null);
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header sticky-modal-header">
              <h3>🎉 Završene rezervacije</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => {
                  setShowCompletedModal(false);
                  setExpandedOwnerBookingId(null);
                }}
              >
                ✖
              </button>
            </div>

            {renderOwnerBookingsAccordion(completedBookings)}
          </div>
        </div>
      )}

      {showConfirmedModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowConfirmedModal(false);
            setExpandedOwnerBookingId(null);
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header sticky-modal-header">
              <h3>✅ Potvrđene rezervacije</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => {
                  setShowConfirmedModal(false);
                  setExpandedOwnerBookingId(null);
                }}
              >
                ✖
              </button>
            </div>

            {renderOwnerBookingsAccordion(upcomingConfirmedBookings)}
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;
