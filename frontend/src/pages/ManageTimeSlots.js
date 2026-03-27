import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMyPlayrooms } from "../services/playroomService";
import {
  getTimeSlots,
  createBooking,
  getMyTimeSlots,
} from "../services/bookingService";
import { useAuth } from "../context/AuthContext";
import "../styles/ManageTimeSlots.css";

const ManageTimeSlots = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [playrooms, setPlayrooms] = useState([]);
  const [selectedPlayroom, setSelectedPlayroom] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [brojDece, setBrojDece] = useState(1);
  const [napomena, setNapomena] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPlayrooms();
  }, []);

  useEffect(() => {
    if (selectedPlayroom) {
      loadTimeSlots();
    }
  }, [selectedPlayroom, selectedDate]);

  const loadPlayrooms = async () => {
    const result = await getMyPlayrooms();
    if (result.success && result.data.length > 0) {
      setPlayrooms(result.data);
      setSelectedPlayroom(result.data[0]._id);
    }
    setLoading(false);
  };

  const loadTimeSlots = async () => {
    setLoading(true);
    const result = await getTimeSlots(selectedPlayroom, selectedDate);
    if (result.success) {
      setTimeSlots(result.data);
    }
    setLoading(false);
  };

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot);
    setBrojDece(1);
    setNapomena("");
    setShowModal(true);
  };

  const handleManualBook = async () => {
    if (!selectedSlot) return;

    setSubmitting(true);
    const result = await createBooking({
      playroomId: selectedPlayroom,
      datum: selectedDate,
      vremeOd: selectedSlot.vremeOd,
      vremeDo: selectedSlot.vremeDo,
      brojDece: brojDece,
      napomena: `Ručna rezervacija: ${napomena}`,
    });

    if (result.success) {
      setMessage("Termin je uspešno zauzet!");
      setShowModal(false);
      loadTimeSlots();
      setTimeout(() => setMessage(""), 3000);
    } else {
      alert(result.error);
    }
    setSubmitting(false);
  };

  const getSlotStatus = (slot) => {
    if (slot.zauzeto)
      return { text: "ZAUZETO", class: "slot-booked", disabled: true };
    return { text: "SLOBODNO", class: "slot-free", disabled: false };
  };

  // Generiši dane u mesecu za prikaz
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay();

    const days = [];
    // Prazni dani na početku
    for (let i = 0; i < (startWeekday === 0 ? 6 : startWeekday - 1); i++) {
      days.push(null);
    }
    // Dani u mesecu
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getSlotsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${selectedDate.split("-")[0]}-${selectedDate.split("-")[1]}-${day.toString().padStart(2, "0")}`;
    return timeSlots.filter((slot) => {
      const slotDate = new Date(slot.datum).toISOString().split("T")[0];
      return slotDate === dateStr;
    });
  };

  const hasAvailableSlot = (day) => {
    const slots = getSlotsForDay(day);
    return slots.some((slot) => !slot.zauzeto);
  };

  const isFullyBooked = (day) => {
    const slots = getSlotsForDay(day);
    return slots.length > 0 && slots.every((slot) => slot.zauzeto);
  };

  const changeMonth = (offset) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setSelectedDate(newDate.toISOString().split("T")[0]);
  };

  const monthNames = [
    "Januar",
    "Februar",
    "Mart",
    "April",
    "Maj",
    "Jun",
    "Jul",
    "Avgust",
    "Septembar",
    "Oktobar",
    "Novembar",
    "Decembar",
  ];

  if (user?.role !== "vlasnik" && user?.role !== "admin") {
    return (
      <div className="container">
        <h1>Pristup zabranjen</h1>
        <p>Samo vlasnici igraonica mogu upravljati terminima.</p>
      </div>
    );
  }

  if (playrooms.length === 0) {
    return (
      <div className="container">
        <h1>🏢 Nemate igraonicu</h1>
        <p>Prvo morate dodati igraonicu.</p>
        <button
          className="btn-primary"
          onClick={() => navigate("/create-playroom")}
        >
          + Dodaj igraonicu
        </button>
      </div>
    );
  }

  const currentDate = new Date(selectedDate);
  const days = getDaysInMonth(currentDate);

  return (
    <div className="container manage-slots-page">
      <div className="manage-slots-header">
        <h1>📅 Upravljanje terminima</h1>
        <div className="playroom-selector">
          <label>Izaberite igraonicu:</label>
          <select
            value={selectedPlayroom}
            onChange={(e) => setSelectedPlayroom(e.target.value)}
          >
            {playrooms.map((p) => (
              <option key={p._id} value={p._id}>
                {p.naziv}
              </option>
            ))}
          </select>
        </div>
      </div>

      {message && <div className="success-message">{message}</div>}

      {/* Kalendar */}
      <div className="calendar-container">
        <div className="calendar-header">
          <button className="month-nav" onClick={() => changeMonth(-1)}>
            ◀
          </button>
          <h2>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button className="month-nav" onClick={() => changeMonth(1)}>
            ▶
          </button>
        </div>

        <div className="calendar-weekdays">
          <span>Pon</span>
          <span>Uto</span>
          <span>Sre</span>
          <span>Čet</span>
          <span>Pet</span>
          <span>Sub</span>
          <span>Ned</span>
        </div>

        <div className="calendar-days">
          {days.map((day, idx) => {
            if (day === null) {
              return (
                <div key={`empty-${idx}`} className="calendar-day empty"></div>
              );
            }

            const hasSlots = getSlotsForDay(day).length > 0;
            const isAvailable = hasAvailableSlot(day);
            const isBooked = isFullyBooked(day);

            let dayClass = "calendar-day";
            if (!hasSlots) dayClass += " no-slots";
            else if (isAvailable) dayClass += " available";
            else if (isBooked) dayClass += " booked";

            return (
              <div
                key={day}
                className={dayClass}
                onClick={() => {
                  const dateStr = `${selectedDate.split("-")[0]}-${selectedDate.split("-")[1]}-${day.toString().padStart(2, "0")}`;
                  setSelectedDate(dateStr);
                }}
              >
                <span className="day-number">{day}</span>
                {hasSlots && (
                  <div className="day-slots-info">
                    {isAvailable ? "🟢" : isBooked ? "🔴" : "⚪"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Termini za izabrani dan */}
      <div className="selected-day-slots">
        <h3>Termini za {new Date(selectedDate).toLocaleDateString("sr-RS")}</h3>

        {loading ? (
          <div className="loading">Učitavanje termina...</div>
        ) : timeSlots.length === 0 ? (
          <div className="no-slots">
            <p>📭 Nema termina za ovaj dan.</p>
            <p className="hint">
              Igraonica možda ne radi ovog dana ili nema definisane termine.
            </p>
          </div>
        ) : (
          <div className="slots-list">
            {timeSlots.map((slot, idx) => {
              const status = getSlotStatus(slot);
              return (
                <div
                  key={idx}
                  className={`slot-card ${status.class}`}
                  onClick={() => !slot.zauzeto && handleSlotClick(slot)}
                >
                  <div className="slot-time">
                    ⏰ {slot.vremeOd} - {slot.vremeDo}
                  </div>
                  <div className="slot-info">
                    <span>
                      👥 {slot.slobodno}/{slot.maxDece}
                    </span>
                    <span>💰 {slot.cena} RSD</span>
                  </div>
                  <div className={`slot-status ${status.class}`}>
                    {status.text}
                  </div>
                  {slot.zauzeto && (
                    <div className="slot-booked-info">Rezervisano</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal za ručnu rezervaciju */}
      {showModal && selectedSlot && (
        <div className="booking-modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📝 Ručna rezervacija</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                ✖
              </button>
            </div>
            <div className="modal-body">
              <p>
                <strong>Termin:</strong> {selectedSlot.vremeOd} -{" "}
                {selectedSlot.vremeDo}
              </p>
              <p>
                <strong>Cena:</strong> {selectedSlot.cena} RSD
              </p>

              <div className="form-group">
                <label>👶 Broj dece</label>
                <input
                  type="number"
                  min="1"
                  max={selectedSlot.slobodno}
                  value={brojDece}
                  onChange={(e) =>
                    setBrojDece(
                      Math.min(
                        selectedSlot.slobodno,
                        parseInt(e.target.value) || 1,
                      ),
                    )
                  }
                />
              </div>

              <div className="form-group">
                <label>📝 Napomena (opciono)</label>
                <textarea
                  rows="3"
                  value={napomena}
                  onChange={(e) => setNapomena(e.target.value)}
                  placeholder="Unesite dodatne informacije (npr. alergije, posebni zahtevi)"
                />
              </div>

              <div className="price-summary">
                <span>Ukupno:</span>
                <strong>{brojDece * selectedSlot.cena} RSD</strong>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowModal(false)}
              >
                Otkaži
              </button>
              <button
                className="btn-confirm"
                onClick={handleManualBook}
                disabled={submitting}
              >
                {submitting ? "Rezervišem..." : "✅ Zauzmi termin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTimeSlots;
