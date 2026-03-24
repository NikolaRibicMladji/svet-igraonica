import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMyPlayrooms } from "../services/playroomService";
import {
  getAllTimeSlotsForOwner,
  manualBookTimeSlot,
} from "../services/bookingService";
import { useAuth } from "../context/AuthContext";
import ManualBookingModal from "../components/ManualBookingModal";
import "../styles/OwnerTimeSlots.css";

const OwnerTimeSlots = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [playrooms, setPlayrooms] = useState([]);
  const [selectedPlayroom, setSelectedPlayroom] = useState("");
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [message, setMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPlayrooms();
  }, []);

  useEffect(() => {
    if (selectedPlayroom) {
      loadTimeSlots();
    }
  }, [selectedPlayroom, selectedDate]);

  const loadPlayrooms = async () => {
    setLoading(true);
    const result = await getMyPlayrooms();
    if (result.success && result.data.length > 0) {
      setPlayrooms(result.data);
      setSelectedPlayroom(result.data[0]._id);
    } else {
      setError("Nemate nijednu igraonicu. Prvo dodajte igraonicu.");
    }
    setLoading(false);
  };

  const loadTimeSlots = async () => {
    if (!selectedPlayroom) return;
    setLoading(true);
    setError("");
    const result = await getAllTimeSlotsForOwner(
      selectedPlayroom,
      selectedDate,
    );
    if (result.success) {
      setTimeSlots(result.data);
      if (result.data.length === 0) {
        setError("Nema termina za izabrani datum. Igraonica možda ne radi.");
      }
    } else {
      setError(result.error || "Greška pri učitavanju termina");
    }
    setLoading(false);
  };

  // OTVORI MODAL ZA RUČNU REZERVACIJU
  const openManualBooking = (slot) => {
    setSelectedSlot(slot);
    setModalOpen(true);
  };

  // POTVRDI REZERVACIJU IZ MODALA
  const confirmManualBooking = async (slot, brojDece, napomena) => {
    setMessage("");
    const result = await manualBookTimeSlot(slot._id, brojDece, napomena);
    if (result.success) {
      setMessage(result.message);
      loadTimeSlots(); // Osvježi termine
      setTimeout(() => setMessage(""), 3000);
      return true;
    } else {
      setError(result.error);
      setTimeout(() => setError(""), 3000);
      return false;
    }
  };

  const formatDate = (dateString) => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString("sr-RS", options);
  };

  // Pronađi podatke o izabranoj igraonici za modal
  const selectedPlayroomData = playrooms.find(
    (p) => p._id === selectedPlayroom,
  );

  if (user?.role !== "vlasnik" && user?.role !== "admin") {
    return (
      <div className="container">
        <div className="error-state">
          <h1>🔒 Pristup zabranjen</h1>
          <p>Samo vlasnici igraonica mogu da vide ovu stranicu.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container owner-slots-page">
      <h1>📅 Pregled termina</h1>
      <p className="subtitle">
        Pregledajte sve termine i ručno rezervišite za telefonske pozive
      </p>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="filters">
        <div className="filter-group">
          <label>🏢 Izaberite igraonicu:</label>
          <select
            value={selectedPlayroom}
            onChange={(e) => setSelectedPlayroom(e.target.value)}
            className="playroom-select"
          >
            {playrooms.map((p) => (
              <option key={p._id} value={p._id}>
                {p.naziv}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>📅 Izaberite datum:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
            min={new Date().toISOString().split("T")[0]}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading">Učitavanje termina...</div>
      ) : timeSlots.length === 0 ? (
        <div className="empty-state">
          <p>😢 Nema termina za izabrani datum.</p>
          <p className="empty-hint">
            {selectedPlayroomData?.radnoVreme
              ? "Igraonica ne radi ovog dana ili nema definisane termine."
              : "Proverite da li igraonica ima definisano radno vreme."}
          </p>
          <button
            className="btn-primary"
            onClick={() => navigate("/manage-slots")}
          >
            📅 Upravljanje terminima
          </button>
        </div>
      ) : (
        <>
          <h2 className="date-title">{formatDate(selectedDate)}</h2>
          <div className="stats-summary">
            <div className="stat-card">
              <span className="stat-number">{timeSlots.length}</span>
              <span className="stat-label">Ukupno termina</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">
                {timeSlots.filter((s) => !s.zauzeto).length}
              </span>
              <span className="stat-label">Slobodnih</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">
                {timeSlots.filter((s) => s.zauzeto).length}
              </span>
              <span className="stat-label">Zauzetih</span>
            </div>
          </div>

          <div className="slots-grid-owner">
            {timeSlots.map((slot) => (
              <div
                key={slot._id}
                className={`slot-card-owner ${slot.zauzeto ? "zauzeto" : "slobodno"}`}
              >
                <div className="slot-time-large">
                  <span className="time-icon">⏰</span>
                  <span className="time-range">
                    {slot.vremeOd} - {slot.vremeDo}
                  </span>
                </div>
                <div className="slot-price-large">
                  <span className="price-amount">{slot.cena} RSD</span>
                  <span className="price-unit">/ termin</span>
                </div>
                <div
                  className={`status-badge-large ${slot.zauzeto ? "zauzeto" : "slobodno"}`}
                >
                  {slot.zauzeto ? "🔴 ZAUZETO" : "🟢 SLOBODNO"}
                </div>

                {slot.booking && (
                  <div className="booking-info">
                    <div className="booking-header">
                      <span className="booking-icon">👤</span>
                      <span className="booking-title">
                        Podaci o rezervaciji
                      </span>
                    </div>
                    <p>
                      <strong>Rezervisao:</strong> {slot.booking.roditelj?.ime}{" "}
                      {slot.booking.roditelj?.prezime}
                    </p>
                    <p>
                      <strong>📞 Telefon:</strong>{" "}
                      {slot.booking.roditelj?.telefon || "Nije uneto"}
                    </p>
                    <p>
                      <strong>📧 Email:</strong>{" "}
                      {slot.booking.roditelj?.email || "Nije uneto"}
                    </p>
                    <p>
                      <strong>👶 Broj dece:</strong>{" "}
                      {slot.booking.brojDece || 1}
                    </p>
                    <p>
                      <strong>💰 Ukupno:</strong> {slot.booking.ukupnaCena} RSD
                    </p>
                    {slot.booking.napomena && (
                      <p className="booking-note">
                        <strong>📝 Napomena:</strong> {slot.booking.napomena}
                      </p>
                    )}
                  </div>
                )}

                {!slot.zauzeto && (
                  <button
                    className="btn-book-manual"
                    onClick={() => openManualBooking(slot)}
                  >
                    📝 Ručna rezervacija
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* MODAL ZA RUČNU REZERVACIJU */}
      <ManualBookingModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedSlot(null);
        }}
        slot={selectedSlot}
        playroom={selectedPlayroomData}
        onConfirm={confirmManualBooking}
      />
    </div>
  );
};

export default OwnerTimeSlots;
