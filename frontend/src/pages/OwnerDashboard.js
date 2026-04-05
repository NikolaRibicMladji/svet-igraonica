import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { getOwnerBookings, confirmBooking } from "../services/bookingService";
import "../styles/OwnerDashboard.css";

const OwnerDashboard = () => {
  const { user, loading: authLoading } = useAuth();

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

  useEffect(() => {
    if (!authLoading) {
      fetchMyPlayrooms();
      fetchBookings();
    }
  }, [authLoading]);

  useEffect(() => {
    if (selectedPlayroomId) {
      fetchStats(selectedPlayroomId);
    } else {
      setStats(null);
    }
  }, [selectedPlayroomId]);

  useEffect(() => {
    if (authLoading) return;

    const interval = setInterval(() => {
      fetchBookings();

      if (selectedPlayroomId) {
        fetchStats(selectedPlayroomId);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [authLoading, selectedPlayroomId]);

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

  const fetchStats = async (playroomId) => {
    try {
      setStatsLoading(true);
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
      setStatsLoading(false);
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
        await fetchBookings();

        if (selectedPlayroomId) {
          await fetchStats(selectedPlayroomId);
        }
      } else {
        setError(res?.error || "Greška pri potvrdi rezervacije.");
      }
    } catch (err) {
      console.error("Greška pri potvrdi:", err);
      setError(
        err?.response?.data?.message || "Greška pri potvrdi rezervacije.",
      );
    } finally {
      setConfirmingId("");
    }
  };

  const getPlayroomId = (booking) =>
    typeof booking.playroomId === "object"
      ? booking.playroomId?._id
      : booking.playroomId;

  const filteredBookings = useMemo(() => {
    if (!selectedPlayroomId) return bookings;

    return bookings.filter((booking) => {
      return getPlayroomId(booking) === selectedPlayroomId;
    });
  }, [bookings, selectedPlayroomId]);

  const pendingBookings = useMemo(
    () => filteredBookings.filter((b) => b.status === "cekanje"),
    [filteredBookings],
  );

  const confirmedBookings = useMemo(
    () => filteredBookings.filter((b) => b.status === "potvrdjeno"),
    [filteredBookings],
  );

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
          <div className="stat-card blue">
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
              <h3>{confirmedBookings.length}</h3>
              <p>Potvrđene rezervacije</p>
            </div>
          </div>

          <div className="stat-card orange">
            <span className="stat-icon">🎉</span>
            <div className="stat-info">
              <h3>{stats?.completedBookings ?? 0}</h3>
              <p>Završene rezervacije</p>
            </div>
          </div>

          <div className="stat-card purple">
            <span className="stat-icon">💰</span>
            <div className="stat-info">
              <h3>{stats?.totalRevenue ?? 0} RSD</h3>
              <p>Ukupna zarada</p>
            </div>
          </div>
        </div>
      )}

      <div className="owner-bookings">
        <div className="confirmed-header">
          <h3>📋 Rezervacije na čekanju</h3>
        </div>

        {bookingsLoading ? (
          <div className="loading-container">⏳ Učitavanje rezervacija...</div>
        ) : pendingBookings.length === 0 ? (
          <div className="empty-state">
            <p>Nema rezervacija na čekanju za izabranu igraonicu.</p>
          </div>
        ) : (
          <div className="owner-bookings-list">
            {pendingBookings.map((booking) => (
              <div key={booking._id} className="booking-card">
                <div className="booking-status-row">
                  <span className="status-badge pending">Čeka potvrdu</span>
                </div>

                <p>
                  <strong>
                    {booking.imeRoditelja} {booking.prezimeRoditelja}
                  </strong>
                </p>

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

                <button
                  className="btn-confirm-booking"
                  onClick={() => handleConfirm(booking._id)}
                  disabled={
                    confirmingId === booking._id || booking.status !== "cekanje"
                  }
                >
                  {confirmingId === booking._id
                    ? "Potvrđujem..."
                    : "Potvrdi rezervaciju"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showConfirmedModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowConfirmedModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✅ Potvrđene rezervacije</h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowConfirmedModal(false)}
              >
                ✖
              </button>
            </div>

            {confirmedBookings.length === 0 ? (
              <div className="empty-state modal-empty">
                <p>Nema potvrđenih rezervacija.</p>
              </div>
            ) : (
              <div className="owner-bookings-list modal-bookings-list">
                {confirmedBookings.map((booking) => (
                  <div key={booking._id} className="booking-card">
                    <div className="booking-status-row">
                      <span className="status-badge confirmed">Potvrđeno</span>
                    </div>

                    <p>
                      <strong>
                        {booking.imeRoditelja} {booking.prezimeRoditelja}
                      </strong>
                    </p>

                    <p>📧 {booking.emailRoditelja || "-"}</p>
                    <p>
                      📞 {booking.telefonRoditelja || booking.telefon || "-"}
                    </p>
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;
