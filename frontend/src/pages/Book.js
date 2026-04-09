import React, { useEffect, useRef, useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getAvailableTimeSlots,
  createBooking,
  createGuestBooking,
} from "../services/bookingService";
import { getPlayroomById } from "../services/playroomService";
import { useAuth } from "../context/AuthContext";
import "../styles/Book.css";

const Book = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const bookingFormRef = useRef(null);
  const topRef = useRef(null);

  const [playroom, setPlayroom] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [napomena, setNapomena] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const [korisnikPodaci, setKorisnikPodaci] = useState({
    ime: "",
    prezime: "",
    email: "",
    telefon: "",
    password: "",
    confirmPassword: "",
  });

  const loadPlayroom = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getPlayroomById(id);

      if (result?.success) {
        setPlayroom(result.data);
      } else {
        setError(result?.error || "Greška pri učitavanju igraonice.");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri učitavanju igraonice.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadTimeSlots = useCallback(async () => {
    setLoadingSlots(true);
    setError("");
    setSelectedSlot(null);

    try {
      const result = await getAvailableTimeSlots(id, selectedDate);

      if (result?.success) {
        const availableSlots = Array.isArray(result.data)
          ? result.data.filter((slot) => {
              if (!slot?._id) return false;
              if (slot?.zauzeto) return false;
              if (slot?.isPast) return false;
              if (slot?.status && slot.status !== "slobodno") return false;
              return true;
            })
          : [];

        setTimeSlots(availableSlots);
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
  }, [id, selectedDate]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      setKorisnikPodaci((prev) => ({
        ...prev,
        ime: user.ime || prev.ime || "",
        prezime: user.prezime || prev.prezime || "",
        email: user.email || prev.email || "",
        telefon: user.telefon || prev.telefon || "",
        password: "",
        confirmPassword: "",
      }));
    }
  }, [authLoading, isAuthenticated, user]);

  useEffect(() => {
    loadPlayroom();
  }, [loadPlayroom]);

  useEffect(() => {
    if (playroom?._id) {
      loadTimeSlots();
    }
  }, [playroom?._id, loadTimeSlots]);

  const scrollToBookingForm = () => {
    setTimeout(() => {
      if (bookingFormRef.current) {
        bookingFormRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 150);
  };

  const scrollToTop = () => {
    setTimeout(() => {
      if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 100);
  };

  const cenaTermina = Number(selectedSlot?.cena || 0);

  const handleBook = async () => {
    setError("");

    if (!selectedSlot?._id) {
      setError("Izaberite termin.");
      scrollToTop();
      return;
    }

    if (
      selectedSlot?.zauzeto ||
      selectedSlot?.isPast ||
      (selectedSlot?.status && selectedSlot.status !== "slobodno")
    ) {
      setError("Termin više nije dostupan. Izaberite drugi termin.");
      setSelectedSlot(null);
      await loadTimeSlots();
      scrollToTop();
      return;
    }

    if (!korisnikPodaci.ime.trim()) {
      setError("Unesite ime.");
      scrollToTop();
      return;
    }

    if (!korisnikPodaci.prezime.trim()) {
      setError("Unesite prezime.");
      scrollToTop();
      return;
    }

    if (!korisnikPodaci.email.trim()) {
      setError("Unesite email.");
      scrollToTop();
      return;
    }

    if (!korisnikPodaci.telefon.trim()) {
      setError("Unesite telefon.");
      scrollToTop();
      return;
    }

    if (!isAuthenticated) {
      if (!korisnikPodaci.password.trim()) {
        setError("Unesite lozinku.");
        scrollToTop();
        return;
      }

      if (korisnikPodaci.password.trim().length < 6) {
        setError("Lozinka mora imati najmanje 6 karaktera.");
        scrollToTop();
        return;
      }

      if (!korisnikPodaci.confirmPassword.trim()) {
        setError("Potvrdite lozinku.");
        scrollToTop();
        return;
      }

      if (korisnikPodaci.password !== korisnikPodaci.confirmPassword) {
        setError("Lozinke se ne poklapaju.");
        scrollToTop();
        return;
      }
    }

    setSubmitting(true);

    try {
      const bookingPayload = {
        slotId: selectedSlot._id,
        ime: korisnikPodaci.ime.trim(),
        prezime: korisnikPodaci.prezime.trim(),
        email: korisnikPodaci.email.trim().toLowerCase(),
        telefon: korisnikPodaci.telefon.trim(),
        napomena: napomena.trim(),
      };

      let result;

      if (isAuthenticated) {
        result = await createBooking(bookingPayload);
      } else {
        result = await createGuestBooking({
          ...bookingPayload,
          password: korisnikPodaci.password,
          confirmPassword: korisnikPodaci.confirmPassword,
        });
      }

      if (result?.success) {
        await loadTimeSlots();
        navigate("/booking-success");
      } else {
        setError(result?.error || "Rezervacija nije uspela.");
        scrollToTop();
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Rezervacija nije uspela.",
      );
      scrollToTop();
    } finally {
      setSubmitting(false);
    }
  };

  const handleKorisnikChange = (e) => {
    const { name, value } = e.target;
    setKorisnikPodaci((prev) => ({ ...prev, [name]: value }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("sr-RS", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getSlotStatus = (slot) => {
    if (slot?.zauzeto) {
      return { text: "ZAUZETO", class: "slot-full", disabled: true };
    }

    return { text: "SLOBODNO", class: "slot-free", disabled: false };
  };

  if (loading) {
    return <div className="container loading">Učitavanje...</div>;
  }

  if (!playroom) {
    return (
      <div className="container loading">
        Nije moguće učitati podatke o igraonici.
      </div>
    );
  }

  const trulyAvailableSlots = Array.isArray(timeSlots)
    ? timeSlots.filter((slot) => {
        if (!slot?._id) return false;
        if (slot?.zauzeto) return false;
        if (slot?.isPast) return false;
        if (slot?.status && slot.status !== "slobodno") return false;
        return true;
      })
    : [];

  return (
    <div className="container book-page" ref={topRef}>
      <button
        className="back-link"
        onClick={() => navigate(`/playrooms/${id}`)}
      >
        ← Nazad na igraonicu
      </button>

      <div className="book-card">
        <div className="book-header">
          <h1>Rezerviši termin</h1>
          <div className="playroom-badge">
            <h2>{playroom.naziv}</h2>
            <p className="location">
              📍 {playroom.adresa}, {playroom.grad}
            </p>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="date-selector">
          <label>📅 Izaberite datum</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="date-input"
          />
        </div>

        <div className="slots-section">
          <h3>Dostupni termini za {formatDate(selectedDate)}</h3>

          {loadingSlots ? (
            <div className="loading-slots">Učitavanje termina...</div>
          ) : trulyAvailableSlots.length === 0 ? (
            <div className="no-slots">
              <p>😢 Nema dostupnih termina za izabrani datum.</p>
              <p>Molimo izaberite drugi datum.</p>
            </div>
          ) : (
            <div className="slots-grid">
              {trulyAvailableSlots.map((slot) => {
                const status = getSlotStatus(slot);
                const isSelected = selectedSlot?._id === slot._id;

                return (
                  <div
                    key={slot._id}
                    className={`slot-card ${status.class} ${
                      isSelected ? "selected" : ""
                    }`}
                    onClick={() => {
                      if (
                        !status.disabled &&
                        !slot?.zauzeto &&
                        !slot?.isPast &&
                        (!slot?.status || slot.status === "slobodno")
                      ) {
                        setSelectedSlot(slot);
                        setError("");
                        scrollToBookingForm();
                      }
                    }}
                  >
                    <div className="slot-time">
                      <span className="time-icon">⏰</span>
                      <span className="time-range">
                        {slot.vremeOd} - {slot.vremeDo}
                      </span>
                    </div>

                    <div className={`slot-status-badge ${status.class}`}>
                      {status.text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedSlot && !loadingSlots && trulyAvailableSlots.length > 0 && (
          <div className="booking-form" ref={bookingFormRef}>
            <h3>Detalji rezervacije</h3>

            <div className="selected-slot-summary">
              <p>📅 Datum: {formatDate(selectedDate)}</p>
              <p>
                ⏰ Vreme: {selectedSlot.vremeOd} - {selectedSlot.vremeDo}
              </p>
              <p>💰 Cena termina: {cenaTermina} RSD</p>
              <p>🎟️ Jedan termin = jedna rezervacija</p>
              {cenaTermina === 0 && (
                <small className="price-hint">Cena nije definisana</small>
              )}
            </div>

            {Array.isArray(playroom.besplatnePogodnosti) &&
              playroom.besplatnePogodnosti.length > 0 && (
                <div className="free-features-section">
                  <h4>✨ Besplatne pogodnosti</h4>
                  <div className="free-features-list">
                    {playroom.besplatnePogodnosti.map((pog, index) => (
                      <span key={`${pog}-${index}`} className="free-badge">
                        ✓ {pog}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            <div className="user-data-section">
              <div className="user-data-header">
                <h4>👤 Vaši podaci</h4>

                {!isAuthenticated && (
                  <span className="user-info-text">
                    ( Nakon potvrde rezervacije bićete automatski registrovani i
                    prijavljeni )
                  </span>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Ime *</label>
                  <input
                    type="text"
                    name="ime"
                    value={korisnikPodaci.ime}
                    onChange={handleKorisnikChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Prezime *</label>
                  <input
                    type="text"
                    name="prezime"
                    value={korisnikPodaci.prezime}
                    onChange={handleKorisnikChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={korisnikPodaci.email}
                    onChange={handleKorisnikChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Telefon *</label>
                  <input
                    type="tel"
                    name="telefon"
                    value={korisnikPodaci.telefon}
                    onChange={handleKorisnikChange}
                    required
                  />
                </div>
              </div>

              {!isAuthenticated && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Lozinka *</label>
                    <input
                      type="password"
                      name="password"
                      value={korisnikPodaci.password}
                      onChange={handleKorisnikChange}
                      required={!isAuthenticated}
                    />
                  </div>

                  <div className="form-group">
                    <label>Potvrda lozinke *</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={korisnikPodaci.confirmPassword}
                      onChange={handleKorisnikChange}
                      required={!isAuthenticated}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>📝 Napomena (opciono)</label>
              <textarea
                rows="3"
                value={napomena}
                onChange={(e) => setNapomena(e.target.value)}
                placeholder="Npr. alergije, posebni zahtevi, dolazak sa kolicima..."
              />
            </div>

            <div className="order-summary">
              <h4>🛒 Pregled rezervacije</h4>

              <div className="summary-item">
                <span>Cena termina</span>
                <span>{cenaTermina} RSD</span>
              </div>

              <div className="summary-total">
                <span>Ukupno za plaćanje:</span>
                <strong>{cenaTermina} RSD</strong>
              </div>
            </div>

            <button
              className="btn-book"
              onClick={handleBook}
              disabled={submitting}
            >
              {submitting
                ? "Rezervišem..."
                : !isAuthenticated
                  ? "✅ Registruj me i potvrdi rezervaciju"
                  : "✅ Potvrdi rezervaciju"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Book;
