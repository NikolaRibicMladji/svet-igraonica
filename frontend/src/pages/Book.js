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
  const [selectedCenaId, setSelectedCenaId] = useState("");
  const [selectedPaketId, setSelectedPaketId] = useState("");
  const [selectedUslugeIds, setSelectedUslugeIds] = useState([]);
  const [brojDece, setBrojDece] = useState("");
  const [brojRoditelja, setBrojRoditelja] = useState("");
  const [kolicineCena, setKolicineCena] = useState({});
  const [kolicinePaketa, setKolicinePaketa] = useState({});
  const [kolicineUsluga, setKolicineUsluga] = useState({});
  const bookingFormRef = useRef(null);
  const topRef = useRef(null);

  const [playroom, setPlayroom] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [selectedStartTime, setSelectedStartTime] = useState("");
  const [selectedEndTime, setSelectedEndTime] = useState("");

  const [napomena, setNapomena] = useState("");

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

  const handleKolicinaChange = (cenaId, value) => {
    setKolicineCena((prev) => ({
      ...prev,
      [cenaId]: Number(value) || 0,
    }));
  };

  const handleKolicinaPaketaChange = (paketId, value) => {
    setKolicinePaketa((prev) => ({
      ...prev,
      [paketId]: Number(value) || 0,
    }));
  };

  const handleKolicinaUslugeChange = (uslugaId, value) => {
    setKolicineUsluga((prev) => ({
      ...prev,
      [uslugaId]: Number(value) || 0,
    }));
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

  const selectedCena = Array.isArray(playroom?.cene)
    ? playroom.cene.find((c) => String(c._id) === String(selectedCenaId))
    : null;

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

  const calculateTotal = () => {
    let total = 0;
    const trajanjeSati = getSlotDurationInHours();
    const brojDeceNum = Number(brojDece) || 0;

    if (Array.isArray(playroom.cene)) {
      playroom.cene.forEach((c) => {
        const naziv = String(c.naziv || "").toLowerCase();
        const kolicinaDece = Number(brojDece) || 0;
        const kolicinaRoditelja = Number(brojRoditelja) || 0;

        let kolicina = 0;

        if (naziv === "dete") {
          kolicina = kolicinaDece;
        } else if (naziv === "roditelj") {
          kolicina = kolicinaRoditelja;
        } else {
          kolicina = Number(kolicineCena[c._id]) || 0;
        }

        if (kolicina <= 0 && c.tip !== "fiksno") return;

        if (c.tip === "fiksno") {
          total += Number(c.cena) || 0;
        }

        if (c.tip === "po_osobi") {
          total += (Number(c.cena) || 0) * kolicina;
        }

        if (c.tip === "po_satu") {
          total += (Number(c.cena) || 0) * kolicina * trajanjeSati;
        }
      });
    }

    if (selectedPaket) {
      if (selectedPaket.tip === "fiksno" || !selectedPaket.tip) {
        total += Number(selectedPaket.cena) || 0;
      }

      if (selectedPaket.tip === "po_osobi") {
        total +=
          (Number(selectedPaket.cena) || 0) *
          ((Number(brojDece) || 0) + (Number(brojRoditelja) || 0));
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
        total +=
          (Number(u.cena) || 0) *
          ((Number(brojDece) || 0) + (Number(brojRoditelja) || 0));
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

    const imaNesto = Object.values(kolicineCena).some((v) => v > 0);

    if (!imaNesto) {
      setError("Unesite bar jednu stavku.");
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
        cenaId: selectedCenaId,
        paketId: selectedPaketId || null,
        usluge: selectedUslugeIds,
        brojDece: Number(brojDece) || 0,
        brojRoditelja: Number(brojRoditelja) || 0,
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

  const getCountFieldPriceText = (item, fallbackBesplatno = true) => {
    if (!item) {
      return fallbackBesplatno ? "besplatno" : "";
    }

    const cena = Number(item.cena) || 0;

    if (item.tip === "po_osobi") {
      return `${cena} RSD po osobi`;
    }

    if (item.tip === "po_satu") {
      return `${cena} RSD po satu`;
    }

    if (item.tip === "fiksno") {
      return `${cena} RSD`;
    }

    return `${cena} RSD`;
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

  const cenaDeteObj = playroom?.cene?.find(
    (c) => String(c.naziv).toLowerCase() === "dete",
  );

  const cenaRoditeljObj = playroom?.cene?.find(
    (c) => String(c.naziv).toLowerCase() === "roditelj",
  );

  const cenaDete = Number(cenaDeteObj?.cena) || 0;
  const cenaRoditelj = Number(cenaRoditeljObj?.cena) || 0;

  const tipDete = cenaDeteObj?.tip || "fiksno";
  const tipRoditelj = cenaRoditeljObj?.tip || "fiksno";

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
        ).filter(
          (time) => timeToMinutes(time) > timeToMinutes(selectedStartTime),
        )
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
              setSelectedCenaId("");
              setSelectedPaketId("");
              setSelectedUslugeIds([]);
              setKolicineCena({});
              setKolicinePaketa({});
              setKolicineUsluga({});
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
                          setSelectedEndTime("");
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

                    <div className="form-group">
                      <label>Vreme do *</label>
                      <select
                        className="booking-select"
                        value={selectedEndTime}
                        onChange={(e) => setSelectedEndTime(e.target.value)}
                        disabled={!selectedStartTime}
                      >
                        <option value="">
                          {selectedStartTime
                            ? "Izaberi vreme"
                            : "Prvo izaberi vreme od"}
                        </option>
                        {availableEndTimes.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
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
                  </p>
                </div>

                <div className="form-row count-row">
                  <div className="form-group">
                    <label className="count-label">
                      Broj dece{" "}
                      <span className="inline-bracket-text">
                        ({getCountFieldPriceText(cenaDeteObj, true)})
                      </span>
                    </label>
                    <input
                      className="count-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder=""
                      value={brojDece}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d*$/.test(value)) {
                          setBrojDece(value);
                        }
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="count-label">
                      Broj roditelja{" "}
                      <span className="inline-bracket-text">
                        ({getCountFieldPriceText(cenaRoditeljObj, true)})
                      </span>
                    </label>
                    <input
                      className="count-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder=""
                      value={brojRoditelja}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d*$/.test(value)) {
                          setBrojRoditelja(value);
                        }
                      }}
                    />
                  </div>
                </div>

                {Array.isArray(playroom.cene) && playroom.cene.length > 0 && (
                  <div className="form-group">
                    <div className="booking-options-list">
                      {playroom.cene
                        .filter((c) => {
                          const naziv = String(c.naziv || "").toLowerCase();
                          return naziv !== "dete" && naziv !== "roditelj";
                        })
                        .map((c) => (
                          <div key={c._id} className="option-card">
                            <div className="option-card-header">
                              <strong>{c.naziv}</strong> - {c.cena} RSD ({c.tip}
                              )
                            </div>

                            {c.tip !== "fiksno" && (
                              <input
                                type="number"
                                min="0"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="Količina"
                                value={kolicineCena[c._id] || 0}
                                onChange={(e) =>
                                  handleKolicinaChange(c._id, e.target.value)
                                }
                              />
                            )}
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
                  {/* DECA */}
                  {(Number(brojDece) || 0) > 0 && cenaDete > 0 && (
                    <div className="summary-item">
                      <span>Deca</span>
                      <span>
                        {tipDete === "po_satu"
                          ? `${cenaDete} × ${Number(brojDece) || 0} × ${getSlotDurationInHours()}h = ${
                              cenaDete *
                              (Number(brojDece) || 0) *
                              getSlotDurationInHours()
                            } RSD`
                          : tipDete === "po_osobi"
                            ? `${cenaDete} × ${Number(brojDece) || 0} = ${
                                cenaDete * (Number(brojDece) || 0)
                              } RSD`
                            : `${cenaDete} RSD`}
                      </span>
                    </div>
                  )}

                  {/* RODITELJI */}
                  {(Number(brojRoditelja) || 0) > 0 && cenaRoditelj > 0 && (
                    <div className="summary-item">
                      <span>Roditelji</span>
                      <span>
                        {tipRoditelj === "po_satu"
                          ? `${cenaRoditelj} × ${Number(brojRoditelja) || 0} × ${getSlotDurationInHours()}h = ${
                              cenaRoditelj *
                              (Number(brojRoditelja) || 0) *
                              getSlotDurationInHours()
                            } RSD`
                          : tipRoditelj === "po_osobi"
                            ? `${cenaRoditelj} × ${Number(brojRoditelja) || 0} = ${
                                cenaRoditelj * (Number(brojRoditelja) || 0)
                              } RSD`
                            : `${cenaRoditelj} RSD`}
                      </span>
                    </div>
                  )}
                  {playroom.cene
                    .filter((c) => {
                      const naziv = String(c.naziv || "").toLowerCase();
                      return naziv !== "dete" && naziv !== "roditelj";
                    })
                    .map((c) => (
                      <div key={c._id} className="option-card">
                        <div className="option-card-header">
                          <strong>{c.naziv}</strong> - {c.cena} RSD ({c.tip})
                        </div>

                        {c.tip !== "fiksno" && (
                          <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="Količina"
                            value={kolicineCena[c._id] || 0}
                            onChange={(e) =>
                              handleKolicinaChange(c._id, e.target.value)
                            }
                          />
                        )}
                      </div>
                    ))}
                  {selectedPaket && (
                    <div className="summary-item">
                      <span>{selectedPaket.naziv}</span>
                      <span>
                        {selectedPaket.tip === "po_osobi"
                          ? `${selectedPaket.cena} RSD × ${
                              (Number(brojDece) || 0) +
                              (Number(brojRoditelja) || 0)
                            } = ${
                              (Number(selectedPaket.cena) || 0) *
                              ((Number(brojDece) || 0) +
                                (Number(brojRoditelja) || 0))
                            } RSD`
                          : selectedPaket.tip === "po_satu"
                            ? `${selectedPaket.cena} RSD × ${getSlotDurationInHours()}h = ${
                                (Number(selectedPaket.cena) || 0) *
                                getSlotDurationInHours()
                              } RSD`
                            : `${selectedPaket.cena} RSD`}
                      </span>
                    </div>
                  )}
                  {selectedUsluge.map((u) => (
                    <div className="summary-item" key={u._id}>
                      <span>{u.naziv}</span>
                      <span>
                        {u.tip === "po_osobi"
                          ? `${u.cena} RSD × ${
                              (Number(brojDece) || 0) +
                              (Number(brojRoditelja) || 0)
                            } = ${
                              (Number(u.cena) || 0) *
                              ((Number(brojDece) || 0) +
                                (Number(brojRoditelja) || 0))
                            } RSD`
                          : u.tip === "po_satu"
                            ? `${u.cena} RSD × ${getSlotDurationInHours()}h = ${
                                (Number(u.cena) || 0) * getSlotDurationInHours()
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
