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
import { normalizeText } from "../utils/normalizeText";

const getLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Book = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [selectedCenaIds, setSelectedCenaIds] = useState([]);
  const [selectedPaketId, setSelectedPaketId] = useState("");
  const [selectedUslugeIds, setSelectedUslugeIds] = useState([]);

  const bookingFormRef = useRef(null);
  const topRef = useRef(null);

  const [playroom, setPlayroom] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [selectedStartTime, setSelectedStartTime] = useState("");
  const [selectedEndTime, setSelectedEndTime] = useState("");

  const [napomena, setNapomena] = useState("");
  const [brojDece, setBrojDece] = useState("");
  const [brojRoditelja, setBrojRoditelja] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [selectedDate, setSelectedDate] = useState("");

  const [korisnikPodaci, setKorisnikPodaci] = useState({
    ime: "",
    prezime: "",
    email: "",
    telefon: "",
    password: "",
    confirmPassword: "",
  });

  const hasSelectedDate = Boolean(selectedDate);

  const handleCenaToggle = (cenaId) => {
    setSelectedCenaIds((prev) =>
      prev.includes(String(cenaId))
        ? prev.filter((id) => id !== String(cenaId))
        : [...prev, String(cenaId)],
    );
  };

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
    setSelectedStartTime("");
    setSelectedEndTime("");

    try {
      const result = await getAvailableTimeSlots(id, selectedDate);

      if (result?.success) {
        setAvailability(result.data || null);
      } else {
        setAvailability(null);
        setError(result?.error || "Greška pri učitavanju termina.");
      }
    } catch (err) {
      setAvailability(null);
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
    if (playroom?._id && selectedDate) {
      loadTimeSlots();
    } else {
      setAvailability(null);
      setSelectedStartTime("");
      setSelectedEndTime("");
    }
  }, [playroom?._id, selectedDate, loadTimeSlots]);

  const scrollToTop = () => {
    setTimeout(() => {
      if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 100);
  };

  const selectedCene = Array.isArray(playroom?.cene)
    ? playroom.cene.filter((c) => selectedCenaIds.includes(String(c._id)))
    : [];

  const selectedPaket = Array.isArray(playroom?.paketi)
    ? playroom.paketi.find((p) => String(p._id) === String(selectedPaketId))
    : null;

  const selectedUsluge = Array.isArray(playroom?.dodatneUsluge)
    ? playroom.dodatneUsluge.filter((u) =>
        selectedUslugeIds.includes(String(u._id)),
      )
    : [];

  const getSlotDurationInHours = () => {
    if (!selectedStartTime || !selectedEndTime) return 1;

    const startMinutes = timeToMinutes(selectedStartTime);
    const endMinutes = timeToMinutes(selectedEndTime);
    const diff = endMinutes - startMinutes;

    if (!Number.isFinite(diff) || diff <= 0) return 1;

    return diff / 60;
  };

  const getSlotDurationLabel = () => {
    if (!selectedStartTime || !selectedEndTime) return "";

    const startMinutes = timeToMinutes(selectedStartTime);
    const endMinutes = timeToMinutes(selectedEndTime);
    const diff = endMinutes - startMinutes;

    if (!Number.isFinite(diff) || diff <= 0) return "";

    const sati = Math.floor(diff / 60);
    const minuti = diff % 60;

    if (sati > 0 && minuti > 0) {
      return `${sati}h ${minuti}min`;
    }

    if (sati > 0) {
      return `${sati}h`;
    }

    return `${minuti}min`;
  };

  const calculateTotal = () => {
    let total = 0;
    const trajanjeSati = getSlotDurationInHours();

    if (Array.isArray(selectedCene)) {
      selectedCene.forEach((c) => {
        if (c.tip === "fiksno") {
          total += Number(c.cena) || 0;
        }

        if (c.tip === "po_satu") {
          total += (Number(c.cena) || 0) * trajanjeSati;
        }

        if (c.tip === "po_osobi") {
          const broj = brojDece === "" ? 0 : Number(brojDece);

          total += (Number(c.cena) || 0) * broj;
        }
      });
    }

    if (selectedPaket) {
      if (selectedPaket.tip === "fiksno" || !selectedPaket.tip) {
        total += Number(selectedPaket.cena) || 0;
      }

      if (selectedPaket.tip === "po_osobi") {
        const broj = brojDece === "" ? 0 : Number(brojDece);
        total += (Number(selectedPaket.cena) || 0) * broj;
      }

      if (selectedPaket.tip === "po_satu") {
        total += (Number(selectedPaket.cena) || 0) * getSlotDurationInHours();
      }
    }

    selectedUsluge.forEach((u) => {
      if (u.tip === "fiksno") {
        total += Number(u.cena) || 0;
      }

      if (u.tip === "po_osobi") {
        const broj = brojDece === "" ? 0 : Number(brojDece);
        total += (Number(u.cena) || 0) * broj;
      }

      if (u.tip === "po_satu") {
        total += (Number(u.cena) || 0) * trajanjeSati;
      }
    });

    return total;
  };

  const timeToMinutes = (time) => {
    const [h, m] = String(time || "00:00")
      .split(":")
      .map(Number);
    return h * 60 + m;
  };

  const isQuarterHour = (time) => {
    const [h, m] = String(time || "00:00")
      .split(":")
      .map(Number);

    if (!Number.isFinite(h) || !Number.isFinite(m)) return false;

    return [0, 15, 30, 45].includes(m);
  };

  const generateQuarterHourOptions = (startTime, endTime) => {
    if (!startTime || !endTime) return [];

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    const options = [];

    for (let current = startMinutes; current <= endMinutes; current += 15) {
      const hours = String(Math.floor(current / 60)).padStart(2, "0");
      const minutes = String(current % 60).padStart(2, "0");
      options.push(`${hours}:${minutes}`);
    }

    return options;
  };

  const doesOverlapBusyInterval = (start, end) => {
    const busyIntervals = Array.isArray(availability?.busyIntervals)
      ? availability.busyIntervals
      : [];

    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);

    return busyIntervals.some((interval) => {
      const busyStart = timeToMinutes(interval.vremeOd);
      const busyEnd = timeToMinutes(interval.vremeDo);

      return startMinutes < busyEnd && endMinutes > busyStart;
    });
  };

  const handleBook = async () => {
    setError("");

    if (!selectedStartTime || !selectedEndTime) {
      setError("Izaberite vreme početka i završetka.");
      scrollToTop();
      return;
    }

    if (timeToMinutes(selectedEndTime) <= timeToMinutes(selectedStartTime)) {
      setError("Vreme završetka mora biti posle vremena početka.");
      scrollToTop();
      return;
    }

    if (!availability?.workingHours) {
      setError("Igraonica ne radi tog dana.");
      scrollToTop();
      return;
    }

    if (
      timeToMinutes(selectedStartTime) <
        timeToMinutes(availability.workingHours.vremeOd) ||
      timeToMinutes(selectedEndTime) >
        timeToMinutes(availability.workingHours.vremeDo)
    ) {
      setError("Izabrani termin mora biti unutar radnog vremena.");
      scrollToTop();
      return;
    }

    if (doesOverlapBusyInterval(selectedStartTime, selectedEndTime)) {
      setError("Izabrani termin se preklapa sa zauzetim terminom.");
      scrollToTop();
      return;
    }

    if (selectedCenaIds.length === 0) {
      setError("Izaberi bar jednu stavku iz cenovnika.");
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

    if (!isQuarterHour(selectedStartTime) || !isQuarterHour(selectedEndTime)) {
      setError("Vreme mora biti u koracima od 15 minuta.");
      scrollToTop();
      return;
    }

    setSubmitting(true);

    try {
      const bookingPayload = {
        playroomId: id,
        datum: selectedDate,
        vremeOd: selectedStartTime,
        vremeDo: selectedEndTime,
        cenaIds: selectedCenaIds,
        paketId: selectedPaketId || null,
        usluge: selectedUslugeIds,
        brojDece: brojDece === "" ? 0 : Number(brojDece),
        brojRoditelja: brojRoditelja === "" ? 0 : Number(brojRoditelja),
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
    if (!dateString) return "";

    const parsedDate = new Date(dateString);

    if (Number.isNaN(parsedDate.getTime())) return "";

    return parsedDate.toLocaleDateString("sr-RS", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getPricingLabel = (item) => {
    if (!item) return "";

    if (item.tip === "po_osobi") {
      return "po osobi";
    }

    if (item.tip === "po_satu") {
      return "po satu";
    }

    return "fiksna cena";
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

  const isFiksno = playroom?.rezimRezervacije === "fiksno";
  const trajanjeTermina = Number(playroom?.trajanjeTermina) || 60;
  const vremePripremeTermina = Number(playroom?.vremePripremeTermina) || 0;

  const availableStartTimes = availability?.workingHours
    ? generateQuarterHourOptions(
        availability.workingHours.vremeOd,
        availability.workingHours.vremeDo,
      ).slice(0, -1)
    : [];

  const availableEndTimes =
    availability?.workingHours && selectedStartTime
      ? generateQuarterHourOptions(
          selectedStartTime,
          availability.workingHours.vremeDo,
        ).filter((time) => {
          const startMinutes = timeToMinutes(selectedStartTime);
          const currentMinutes = timeToMinutes(time);

          if (isFiksno) {
            return currentMinutes === startMinutes + trajanjeTermina;
          }

          return currentMinutes > startMinutes;
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
            onChange={(e) => {
              const value = e.target.value;

              setSelectedDate(value);
              setSelectedStartTime("");
              setSelectedEndTime("");
              setSelectedCenaIds([]);
              setSelectedPaketId("");
              setSelectedUslugeIds([]);
              setBrojDece("");
              setBrojRoditelja("");
              setNapomena("");
              setError("");
            }}
            min={getLocalDate()}
            className="date-input"
          />
        </div>
        {!hasSelectedDate && (
          <div className="booking-info-box">
            Prvo izaberi datum da bi se prikazali slobodni termini i ostale
            opcije za rezervaciju.
          </div>
        )}

        {hasSelectedDate && (
          <>
            <div className="slots-section">
              <h3>Dostupnost za {formatDate(selectedDate)}</h3>

              {loadingSlots ? (
                <div className="loading-slots">Učitavanje termina...</div>
              ) : !availability?.workingHours ? (
                <div className="no-slots">
                  <p>😢 Igraonica ne radi za izabrani datum.</p>
                </div>
              ) : (
                <>
                  <div className="selected-slot-summary">
                    <p>
                      🕘 Radno vreme: {availability.workingHours.vremeOd} -{" "}
                      {availability.workingHours.vremeDo}
                    </p>
                  </div>

                  {Array.isArray(availability?.busyIntervals) &&
                  availability.busyIntervals.length > 0 ? (
                    <div className="busy-intervals">
                      <h4>Zauzeti termini</h4>
                      {availability.busyIntervals.map((interval, index) => (
                        <div
                          key={`${interval.vremeOd}-${interval.vremeDo}-${index}`}
                          className="busy-interval-item"
                        >
                          🔒 {interval.vremeOd} - {interval.vremeDo}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-slots">
                      <p>✅ Trenutno nema zauzetih termina za taj datum.</p>
                    </div>
                  )}

                  <div className="form-row time-row">
                    <div className="form-group">
                      <label>Vreme od *</label>
                      <select
                        className="booking-select"
                        value={selectedStartTime}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSelectedStartTime(value);

                          if (playroom?.rezimRezervacije === "fiksno") {
                            const endMinutes =
                              timeToMinutes(value) + trajanjeTermina;
                            const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
                            setSelectedEndTime(endTime);
                          } else {
                            setSelectedEndTime("");
                          }
                        }}
                      >
                        <option value="">Izaberi vreme</option>
                        {availableStartTimes.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>

                    {!isFiksno ? (
                      <div className="form-group">
                        <label>Vreme do *</label>
                        <select
                          className="booking-select"
                          value={selectedEndTime}
                          onChange={(e) => setSelectedEndTime(e.target.value)}
                        >
                          <option value="">Izaberi vreme</option>
                          {availableEndTimes.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="form-group">
                        <label>Trajanje termina</label>
                        <input
                          type="text"
                          value={`${trajanjeTermina} minuta`}
                          disabled
                          className="date-input"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {availability?.workingHours && !loadingSlots && (
              <div className="booking-form" ref={bookingFormRef}>
                <h3>Detalji rezervacije</h3>

                <div className="selected-slot-summary">
                  <p>📅 Datum: {formatDate(selectedDate)}</p>
                  <p>
                    ⏰ Vreme: {selectedStartTime || "-"} -{" "}
                    {selectedEndTime || "-"}
                    {selectedStartTime && selectedEndTime
                      ? ` (${getSlotDurationLabel()})`
                      : ""}
                  </p>
                </div>

                {Array.isArray(playroom.cene) && playroom.cene.length > 0 && (
                  <div className="form-group">
                    <label className="booking-section-title">
                      Stavke iz cenovnika
                    </label>

                    <div className="booking-options-list booking-options-list--flat">
                      {playroom.cene
                        .filter((c) => {
                          const naziv = normalizeText(c.naziv);
                          return naziv !== "dete" && naziv !== "roditelj";
                        })
                        .map((cena) => (
                          <div key={cena._id} className="option-card">
                            <label className="option-check-row">
                              <span>
                                <strong>{cena.naziv}</strong> - {cena.cena} RSD
                                ({getPricingLabel(cena)})
                              </span>

                              <input
                                type="checkbox"
                                checked={selectedCenaIds.includes(
                                  String(cena._id),
                                )}
                                onChange={() => handleCenaToggle(cena._id)}
                              />
                            </label>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {Array.isArray(playroom.paketi) &&
                  playroom.paketi.length > 0 && (
                    <div className="form-group">
                      <label className="booking-section-title">
                        Izaberi paket{" "}
                        <span className="inline-bracket-text">(opciono)</span>
                      </label>

                      <div className="booking-options-list booking-options-list--flat">
                        {playroom.paketi.map((p) => (
                          <div key={p._id} className="option-card">
                            <label className="option-check-row">
                              <span>
                                {p.naziv} - {p.cena} RSD{" "}
                                <span className="inline-bracket-text">
                                  ({getPricingLabel(p)})
                                </span>
                              </span>
                              <input
                                type="checkbox"
                                checked={selectedPaketId === String(p._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPaketId(String(p._id));
                                  } else {
                                    setSelectedPaketId("");
                                  }
                                }}
                              />
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {Array.isArray(playroom.dodatneUsluge) &&
                  playroom.dodatneUsluge.length > 0 && (
                    <div className="form-group">
                      <label className="booking-section-title">
                        Dodatne usluge{" "}
                        <span className="inline-bracket-text">(opciono)</span>
                      </label>

                      <div className="booking-options-list booking-options-list--flat">
                        {playroom.dodatneUsluge.map((u) => (
                          <div key={u._id} className="option-card">
                            <label className="option-check-row">
                              <span>
                                {u.naziv} - {u.cena} RSD{" "}
                                <span className="inline-bracket-text">
                                  ({getPricingLabel(u)})
                                </span>
                              </span>
                              <input
                                type="checkbox"
                                checked={selectedUslugeIds.includes(
                                  String(u._id),
                                )}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedUslugeIds((prev) => [
                                      ...prev,
                                      String(u._id),
                                    ]);
                                  } else {
                                    setSelectedUslugeIds((prev) =>
                                      prev.filter((id) => id !== String(u._id)),
                                    );
                                  }
                                }}
                              />
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Broj dece{" "}
                      <span className="inline-bracket-text">(opciono)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={brojDece}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (
                          val === "" ||
                          (Number(val) >= 0 && Number(val) <= 100)
                        ) {
                          setBrojDece(val);
                        }
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Broj roditelja{" "}
                      <span className="inline-bracket-text">(opciono)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={brojRoditelja}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (
                          val === "" ||
                          (Number(val) >= 0 && Number(val) <= 100)
                        ) {
                          setrojRoditelja(val);
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="user-data-section">
                  <div className="user-data-header">
                    <h4>👤 Vaši podaci</h4>

                    {!isAuthenticated && (
                      <span className="user-info-text">
                        ( Nakon potvrde rezervacije bićete automatski
                        registrovani i prijavljeni )
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
                  <label className="booking-section-title">
                    📝 Napomena{" "}
                    <span className="inline-bracket-text">(opciono)</span>
                  </label>

                  <textarea
                    rows="3"
                    value={napomena}
                    onChange={(e) => setNapomena(e.target.value)}
                    placeholder="Npr. alergije, posebni zahtevi, dolazak sa kolicima..."
                  />
                </div>

                <div className="order-summary">
                  <h4>🛒 Pregled rezervacije</h4>
                  {Number(brojDece) > 0 && (
                    <div className="summary-item">
                      <span>👶 Broj dece</span>
                      <span>{Number(brojDece)}</span>
                    </div>
                  )}

                  {Number(brojRoditelja) > 0 && (
                    <div className="summary-item">
                      <span>🧑 Broj roditelja</span>
                      <span>{Number(brojRoditelja)}</span>
                    </div>
                  )}
                  {selectedCene.length > 0 && (
                    <div className="reservation-summary-items">
                      {selectedCene.map((item) => (
                        <div key={item._id} className="summary-item">
                          <span>{item.naziv}</span>
                          <span>
                            {item.tip === "po_satu"
                              ? `${item.cena} × ${getSlotDurationInHours()}h = ${
                                  item.cena * getSlotDurationInHours()
                                } RSD`
                              : item.tip === "po_osobi"
                                ? `${item.cena} × ${Number(brojDece) || 0} = ${(item.cena || 0) * (brojDece || 0)} RSD`
                                : `${item.cena} RSD`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedPaket && (
                    <div className="summary-item">
                      <span>{selectedPaket.naziv}</span>
                      <span>
                        {selectedPaket.tip === "po_satu"
                          ? `${selectedPaket.cena} RSD × ${getSlotDurationInHours()}h = ${
                              (Number(selectedPaket.cena) || 0) *
                              getSlotDurationInHours()
                            } RSD`
                          : selectedPaket.tip === "po_osobi"
                            ? `${selectedPaket.cena} RSD × ${brojDece || 0} = ${
                                (Number(selectedPaket.cena) || 0) *
                                (Number(brojDece) || 0)
                              } RSD`
                            : `${selectedPaket.cena} RSD`}
                      </span>
                    </div>
                  )}
                  {selectedUsluge.map((u) => (
                    <div className="summary-item" key={u._id}>
                      <span>{u.naziv}</span>
                      <span>
                        {u.tip === "po_satu"
                          ? `${u.cena} RSD × ${getSlotDurationInHours()}h = ${
                              (Number(u.cena) || 0) * getSlotDurationInHours()
                            } RSD`
                          : u.tip === "po_osobi"
                            ? `${u.cena} RSD × ${brojDece || 0} = ${
                                (Number(u.cena) || 0) * (Number(brojDece) || 0)
                              } RSD`
                            : `${u.cena} RSD`}
                      </span>
                    </div>
                  ))}

                  <div className="summary-total">
                    <span>Ukupno za plaćanje:</span>
                    <strong>{calculateTotal()} RSD</strong>
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
          </>
        )}
      </div>
    </div>
  );
};

export default Book;
