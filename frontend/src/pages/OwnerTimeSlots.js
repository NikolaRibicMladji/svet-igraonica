import React, { useEffect, useState } from "react";
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
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [playrooms, setPlayrooms] = useState([]);
  const [selectedPlayroom, setSelectedPlayroom] = useState("");
  const [timeSlots, setTimeSlots] = useState([]);
  const [loadingPlayrooms, setLoadingPlayrooms] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [message, setMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading) {
      loadPlayrooms();
    }
  }, [authLoading]);

  useEffect(() => {
    if (selectedPlayroom) {
      loadTimeSlots();
    }
  }, [selectedPlayroom, selectedDate]);

  const loadPlayrooms = async () => {
    setLoadingPlayrooms(true);
    setError("");
    setMessage("");

    try {
      const result = await getMyPlayrooms();

      if (
        result?.success &&
        Array.isArray(result.data) &&
        result.data.length > 0
      ) {
        setPlayrooms(result.data);
        setSelectedPlayroom((prev) => prev || result.data[0]._id);
      } else {
        setPlayrooms([]);
        setSelectedPlayroom("");
        setError("Nemate nijednu igraonicu. Prvo dodajte igraonicu.");
      }
    } catch (err) {
      setPlayrooms([]);
      setSelectedPlayroom("");
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri učitavanju igraonica.",
      );
    } finally {
      setLoadingPlayrooms(false);
    }
  };

  const loadTimeSlots = async () => {
    if (!selectedPlayroom) return;

    setLoadingSlots(true);
    setError("");
    setMessage("");

    try {
      const result = await getAllTimeSlotsForOwner(
        selectedPlayroom,
        selectedDate,
      );

      if (result?.success) {
        setTimeSlots(Array.isArray(result.data) ? result.data : []);
      } else {
        setTimeSlots([]);
        setError(result?.error || "Greška pri učitavanju termina.");
      }
    } catch (err) {
      setTimeSlots([]);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri učitavanju termina.",
      );
    } finally {
      setLoadingSlots(false);
    }
  };

  const openManualBooking = (slot) => {
    if (!slot || slot.zauzeto) return;
    setSelectedSlot(slot);
    setMessage("");
    setError("");
    setModalOpen(true);
  };

  const closeManualBooking = () => {
    setModalOpen(false);
    setSelectedSlot(null);
  };

  const handleManualBooking = async (bookingData) => {
    if (loadingSlots) return;
    if (!selectedSlot?._id) {
      setError("Termin nije izabran.");
      return;
    }

    setError("");
    setMessage("");

    try {
      const result = await manualBookTimeSlot(selectedSlot._id, bookingData);

      if (result?.success) {
        setMessage(result.message || "Termin je uspešno zauzet.");
        closeManualBooking();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await loadTimeSlots();

        setTimeout(() => {
          setMessage("");
        }, 3000);
      } else {
        setError(result?.error || "Greška pri ručnom zauzimanju termina.");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri ručnom zauzimanju termina.",
      );
      throw err;
    }
  };

  const selectedPlayroomData = playrooms.find(
    (p) => p._id === selectedPlayroom,
  );

  const formatBookingName = (booking) => {
    if (!booking) return "-";

    const ime =
      booking.ime || booking.imeRoditelja || booking.parentFirstName || "";
    const prezime =
      booking.prezime ||
      booking.prezimeRoditelja ||
      booking.parentLastName ||
      "";

    const fullName = `${ime} ${prezime}`.trim();
    return fullName || booking.userName || "-";
  };

  const formatBookingEmail = (booking) => {
    return (
      booking?.email || booking?.emailRoditelja || booking?.parentEmail || "-"
    );
  };

  const formatBookingPhone = (booking) => {
    return (
      booking?.telefon ||
      booking?.telefonRoditelja ||
      booking?.parentPhone ||
      "-"
    );
  };

  if (authLoading || loadingPlayrooms) {
    return <div className="container loading">Učitavanje...</div>;
  }

  if (user?.role !== "vlasnik" && user?.role !== "admin") {
    return (
      <div className="container">
        <h1>Pristup zabranjen</h1>
        <p>Samo vlasnici igraonica mogu upravljati terminima.</p>
      </div>
    );
  }

  return (
    <div className="container owner-slots-page">
      <div className="page-header">
        <h1>📅 Termini igraonice</h1>
        <p>Upravljanje terminima i ručne rezervacije</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      {playrooms.length === 0 ? (
        <div className="empty-state">
          <p>Nemate nijednu igraonicu.</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/create-playroom")}
          >
            Dodaj igraonicu
          </button>
        </div>
      ) : (
        <>
          <div className="filters-card">
            <div className="filter-group">
              <label htmlFor="owner-playroom-select">Izaberite igraonicu</label>
              <select
                id="owner-playroom-select"
                value={selectedPlayroom}
                onChange={(e) => {
                  setSelectedPlayroom(e.target.value);
                  setMessage("");
                  setError("");
                }}
              >
                {playrooms.map((playroom) => (
                  <option key={playroom._id} value={playroom._id}>
                    {playroom.naziv}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="owner-date-select">Izaberite datum</label>
              <input
                id="owner-date-select"
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setMessage("");
                  setError("");
                }}
              />
            </div>
          </div>

          {selectedPlayroomData && (
            <div className="playroom-summary">
              <h2>{selectedPlayroomData.naziv}</h2>
              <p>
                📍 {selectedPlayroomData.adresa}, {selectedPlayroomData.grad}
              </p>
            </div>
          )}

          {loadingSlots ? (
            <div className="loading-slots">Učitavanje termina...</div>
          ) : timeSlots.length === 0 ? (
            <div className="empty-state">
              <p>Nema termina za izabrani datum.</p>
            </div>
          ) : (
            <div className="slots-grid">
              {timeSlots.map((slot) => (
                <div
                  key={slot._id}
                  className={`slot-card ${slot.zauzeto ? "zauzeto" : "slobodno"}`}
                >
                  <div className="slot-header">
                    <h3>
                      {slot.vremeOd} - {slot.vremeDo}
                    </h3>
                    <span
                      className={`slot-status ${
                        slot.zauzeto ? "zauzeto" : "slobodno"
                      }`}
                    >
                      {slot.zauzeto ? "ZAUZETO" : "SLOBODNO"}
                    </span>
                  </div>

                  <div className="slot-body">
                    <p>💰 Cena: {slot.cena || 0} RSD</p>
                    <p>👶 Slobodnih mesta: {slot.slobodno ?? 0}</p>

                    {slot.booking ? (
                      <div className="booking-info">
                        <h4>Rezervacija</h4>
                        <p>👤 {formatBookingName(slot.booking)}</p>
                        <p>📧 {formatBookingEmail(slot.booking)}</p>
                        <p>📞 {formatBookingPhone(slot.booking)}</p>
                        <p>👶 Broj dece: {slot.booking.brojDece || 0}</p>
                        <p>
                          👨‍👩‍👧 Broj roditelja: {slot.booking.brojRoditelja || 0}
                        </p>
                        {slot.booking.napomena && (
                          <p>📝 Napomena: {slot.booking.napomena}</p>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => openManualBooking(slot)}
                        disabled={slot.zauzeto}
                      >
                        Ručno zauzmi termin
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {modalOpen && selectedSlot && (
        <ManualBookingModal
          slot={selectedSlot}
          onClose={closeManualBooking}
          onSubmit={handleManualBooking}
        />
      )}
    </div>
  );
};

export default OwnerTimeSlots;
