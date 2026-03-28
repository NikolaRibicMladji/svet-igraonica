import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPlayroomById } from "../services/playroomService";
import { getTimeSlots, createBooking } from "../services/bookingService";
import "../styles/Book.css";

const Book = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const bookingFormRef = useRef(null);
  const [playroom, setPlayroom] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [brojDece, setBrojDece] = useState("");
  const [brojRoditelja, setBrojRoditelja] = useState("");
  const [napomena, setNapomena] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const [selectedUsluge, setSelectedUsluge] = useState([]);
  const [selectedOstaleCene, setSelectedOstaleCene] = useState([]);
  const topRef = useRef(null);

  const [korisnikPodaci, setKorisnikPodaci] = useState({
    ime: "",
    prezime: "",
    email: "",
    telefon: "",
  });

  useEffect(() => {
    loadPlayroom();
  }, [id]);

  useEffect(() => {
    if (playroom) {
      loadTimeSlots();
    }
  }, [selectedDate, playroom]);

  const loadPlayroom = async () => {
    const result = await getPlayroomById(id);
    if (result.success) {
      setPlayroom(result.data);
    }
  };

  const loadTimeSlots = async () => {
    setLoading(true);
    setSelectedSlot(null);
    const result = await getTimeSlots(id, selectedDate);
    if (result.success) {
      setTimeSlots(result.data);
    } else {
      setError("Greška pri učitavanju termina");
    }
    setLoading(false);
  };

  const scrollToBookingForm = () => {
    setTimeout(() => {
      if (bookingFormRef.current) {
        bookingFormRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 200);
  };

  const toggleUsluga = (usluga) => {
    setSelectedUsluge((prev) => {
      if (prev.find((u) => u.naziv === usluga.naziv)) {
        return prev.filter((u) => u.naziv !== usluga.naziv);
      } else {
        return [...prev, usluga];
      }
    });
  };

  const toggleOstalaCena = (cena) => {
    setSelectedOstaleCene((prev) => {
      if (prev.find((c) => c.naziv === cena.naziv)) {
        return prev.filter((c) => c.naziv !== cena.naziv);
      } else {
        return [...prev, cena];
      }
    });
  };

  const cenaPoDetetu = selectedSlot?.cena || playroom?.osnovnaCena || 0;
  const cenaRoditelj = playroom?.cene?.find(
    (c) =>
      c.naziv.toLowerCase() === "roditelj" ||
      c.naziv.toLowerCase() === "roditelji",
  );

  const brojDeceNum = brojDece === "" ? 0 : parseInt(brojDece);
  const brojRoditeljaNum = brojRoditelja === "" ? 0 : parseInt(brojRoditelja);
  const ukupnoOsoba = brojDeceNum + brojRoditeljaNum;

  let cenaRoditelji = 0;
  if (
    playroom?.cenaRoditelja &&
    playroom.cenaRoditelja.tip !== "ne_naplacuje"
  ) {
    if (playroom.cenaRoditelja.tip === "fiksno") {
      cenaRoditelji = playroom.cenaRoditelja.iznos;
    } else if (playroom.cenaRoditelja.tip === "po_osobi") {
      cenaRoditelji = playroom.cenaRoditelja.iznos * brojRoditeljaNum;
    }
  }

  const ukupnaCena =
    cenaPoDetetu * brojDeceNum +
    cenaRoditelji +
    selectedOstaleCene.reduce((sum, c) => {
      if (c.tip === "po_osobi") {
        return sum + c.cena * ukupnoOsoba;
      }
      return sum + c.cena;
    }, 0) +
    selectedUsluge.reduce((sum, u) => sum + u.cena, 0);

  const scrollToTop = () => {
    setTimeout(() => {
      if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 100);
  };

  const handleBook = async () => {
    if (!selectedSlot) {
      setError("Izaberite termin");
      scrollToTop();
      return;
    }

    if (!brojDece || brojDeceNum < 1) {
      setError("Unesite broj dece");
      scrollToTop();
      return;
    }

    if (
      !korisnikPodaci.ime ||
      !korisnikPodaci.prezime ||
      !korisnikPodaci.email ||
      !korisnikPodaci.telefon
    ) {
      setError("Molimo popunite sve podatke");
      scrollToTop();
      return;
    }

    setSubmitting(true);
    setError("");

    const result = await createBooking({
      playroomId: id,
      datum: selectedDate,
      vremeOd: selectedSlot.vremeOd,
      vremeDo: selectedSlot.vremeDo,
      brojDece: brojDeceNum,
      brojRoditelja: brojRoditeljaNum,
      napomena,
      ime: korisnikPodaci.ime,
      prezime: korisnikPodaci.prezime,
      email: korisnikPodaci.email,
      telefon: korisnikPodaci.telefon,
      selectedOstaleCene: selectedOstaleCene.map((c) => ({
        naziv: c.naziv,
        tip: c.tip,
        cena: c.cena,
      })),
      selectedUsluge: selectedUsluge.map((u) => u.naziv),
      ukupnaCena,
    });

    if (result.success) {
      navigate("/booking-success");
    } else {
      setError(result.error);
    }
    setSubmitting(false);
  };

  const handleKorisnikChange = (e) => {
    const { name, value } = e.target;
    setKorisnikPodaci((prev) => ({ ...prev, [name]: value }));
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

  const getSlotStatus = (slot) => {
    if (slot.zauzeto) {
      return { text: "ZAUZETO", class: "slot-full", disabled: true };
    }
    return { text: "SLOBODNO", class: "slot-free", disabled: false };
  };

  if (!playroom) {
    return <div className="container loading">Učitavanje...</div>;
  }

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

          {loading ? (
            <div className="loading-slots">Učitavanje termina...</div>
          ) : timeSlots.length === 0 ? (
            <div className="no-slots">
              <p>😢 Nema dostupnih termina za izabrani datum.</p>
              <p>Molimo izaberite drugi datum.</p>
            </div>
          ) : (
            <div className="slots-grid">
              {timeSlots.map((slot) => {
                const status = getSlotStatus(slot);
                const isSelected = selectedSlot?._id === slot._id;

                return (
                  <div
                    key={slot._id}
                    className={`slot-card ${status.class} ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      if (!status.disabled) {
                        setSelectedSlot(slot);
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

        {selectedSlot && !loading && timeSlots.length > 0 && (
          <div className="booking-form" ref={bookingFormRef}>
            <h3>Detalji rezervacije</h3>
            <div className="selected-slot-summary">
              <p>
                📅 Datum:{" "}
                {new Date(selectedDate).toLocaleDateString("sr-RS", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p>
                ⏰ Vreme: {selectedSlot.vremeOd} - {selectedSlot.vremeDo}
              </p>
              <p>
                💰 Osnovna cena:{" "}
                {playroom.osnovnaCena ||
                  playroom.cenovnik?.osnovni ||
                  selectedSlot.cena}{" "}
                RSD / dete
              </p>
            </div>

            <div className="form-group">
              <label>👶 Broj dece *</label>
              <input
                type="number"
                min="1"
                max={playroom.kapacitet?.deca || 30}
                value={brojDece}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value >= 1 && value <= (selectedSlot?.slobodno || 30)) {
                    setBrojDece(value);
                  } else if (e.target.value === "") {
                    setBrojDece("");
                  }
                }}
                placeholder="Unesite broj dece"
              />
              <small className="price-hint">
                Maksimalno {playroom.kapacitet?.deca || 30} dece
              </small>
            </div>

            {/* Broj roditelja - UVEK VIDLJIV */}
            <div className="form-group">
              <label>👨‍👩‍👧 Broj roditelja (pratilaca)</label>
              <input
                type="number"
                min="0"
                max={playroom.kapacitet?.roditelji || 50}
                value={brojRoditelja}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    setBrojRoditelja("");
                  } else {
                    const num = parseInt(value);
                    if (!isNaN(num) && num >= 0) {
                      setBrojRoditelja(num);
                    }
                  }
                }}
                placeholder="Unesite broj roditelja"
              />
              <small className="price-hint">
                Maksimalno {playroom.kapacitet?.roditelji || 50} roditelja
              </small>

              {/* Prikaz cene SAMO ako vlasnik naplaćuje */}
              {playroom?.cenaRoditelja &&
                playroom.cenaRoditelja.tip !== "ne_naplacuje" && (
                  <small className="price-hint cena-info">
                    {playroom.cenaRoditelja.tip === "fiksno"
                      ? `Cena: ${playroom.cenaRoditelja.iznos} RSD (fiksno)`
                      : `Cena: ${playroom.cenaRoditelja.iznos} RSD po roditelju`}
                  </small>
                )}
            </div>

            {playroom.cene && playroom.cene.length > 0 && (
              <div className="options-section">
                <h4>💰 Dodatne cene (opciono)</h4>
                <div className="options-grid">
                  {playroom.cene.map((cena, index) => (
                    <div key={index} className="option-card">
                      <label className="option-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedOstaleCene.some(
                            (c) => c.naziv === cena.naziv,
                          )}
                          onChange={() => toggleOstalaCena(cena)}
                        />
                        <span className="option-name">{cena.naziv}</span>
                        <span className="option-price">+{cena.cena} RSD</span>
                        {cena.tip === "po_osobi" && (
                          <span className="option-type">(po osobi)</span>
                        )}
                      </label>
                      {cena.opis && <p className="option-desc">{cena.opis}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {playroom.dodatneUsluge && playroom.dodatneUsluge.length > 0 && (
              <div className="options-section">
                <h4>🎪 Dodatne usluge (opciono)</h4>
                <div className="options-grid">
                  {playroom.dodatneUsluge.map((usluga, index) => (
                    <div key={index} className="option-card">
                      <label className="option-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedUsluge.some(
                            (u) => u.naziv === usluga.naziv,
                          )}
                          onChange={() => toggleUsluga(usluga)}
                        />
                        <span className="option-name">{usluga.naziv}</span>
                        <span className="option-price">+{usluga.cena} RSD</span>
                        {usluga.tip === "po_osobi" && (
                          <span className="option-type">(po osobi)</span>
                        )}
                      </label>
                      {usluga.opis && (
                        <p className="option-desc">{usluga.opis}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {playroom.besplatnePogodnosti &&
              playroom.besplatnePogodnosti.length > 0 && (
                <div className="free-features-section">
                  <h4>✨ Besplatne pogodnosti</h4>
                  <div className="free-features-list">
                    {playroom.besplatnePogodnosti.map((pog, index) => (
                      <span key={index} className="free-badge">
                        ✓ {pog}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            <div className="user-data-section">
              <h4>👤 Vaši podaci</h4>
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

              {brojDeceNum > 0 && (
                <div className="summary-item">
                  <span>
                    {brojDeceNum} dete × {selectedSlot.cena} RSD
                  </span>
                  <span>{brojDeceNum * selectedSlot.cena} RSD</span>
                </div>
              )}

              {brojRoditeljaNum > 0 &&
                playroom?.cenaRoditelja &&
                playroom.cenaRoditelja.tip !== "ne_naplacuje" && (
                  <div className="summary-item">
                    <span>
                      {playroom.cenaRoditelja.tip === "fiksno"
                        ? `${brojRoditeljaNum} roditelj (fiksno)`
                        : `${brojRoditeljaNum} roditelj × ${playroom.cenaRoditelja.iznos} RSD`}
                    </span>
                    <span>
                      {playroom.cenaRoditelja.tip === "fiksno"
                        ? `+${playroom.cenaRoditelja.iznos} RSD`
                        : `+${playroom.cenaRoditelja.iznos * brojRoditeljaNum} RSD`}
                    </span>
                  </div>
                )}

              {selectedOstaleCene.map((c, idx) => (
                <div key={idx} className="summary-item">
                  <span>
                    {c.naziv}
                    {c.tip === "po_osobi" && ` (× ${ukupnoOsoba} osoba)`}
                  </span>
                  <span>
                    {c.tip === "po_osobi"
                      ? `+${c.cena * ukupnoOsoba} RSD`
                      : `+${c.cena} RSD`}
                  </span>
                </div>
              ))}
              {selectedUsluge.map((u, idx) => (
                <div key={idx} className="summary-item">
                  <span>{u.naziv}</span>
                  <span>+{u.cena} RSD</span>
                </div>
              ))}

              <div className="summary-total">
                <span>Ukupno za plaćanje:</span>
                <strong className="total-amount">{ukupnaCena} RSD</strong>
              </div>
            </div>

            <button
              className="btn-book"
              onClick={handleBook}
              disabled={submitting}
            >
              {submitting ? "Rezervišem..." : "✅ Potvrdi rezervaciju"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Book;
