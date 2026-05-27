import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyPlayrooms } from "../services/playroomService";
import {
  getAllTimeSlotsForOwner,
  manualBookInterval,
} from "../services/bookingService";
import ManualBookingModal from "../components/ManualBookingModal";
import { useAuth } from "../context/AuthContext";
import { getLocalDate } from "../utils/bookingUtils";
import "../styles/OwnerTimeSlots.css";

const getPhoneHref = (phone = "") => {
  const safePhone = String(phone || "")
    .trim()
    .replace(/(?!^\+)[^\d]/g, "");

  return safePhone ? `tel:${safePhone}` : "";
};

const OwnerTimeSlots = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [playrooms, setPlayrooms] = useState([]);
  const [selectedPlayroom, setSelectedPlayroom] = useState("");
  const [timeSlots, setTimeSlots] = useState([]);
  const [loadingPlayrooms, setLoadingPlayrooms] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [message, setMessage] = useState("");

  const [error, setError] = useState("");
  const [manualSlot, setManualSlot] = useState(null);
  const [expandedBookingId, setExpandedBookingId] = useState(null);

  const loadPlayrooms = useCallback(async () => {
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
  }, [user?.role]);

  useEffect(() => {
    if (!authLoading) {
      loadPlayrooms();
    }
  }, [authLoading, loadPlayrooms]);

  const loadTimeSlots = useCallback(async () => {
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
        setTimeSlots(
          Array.isArray(result.data)
            ? result.data.sort((a, b) => a.vremeOd.localeCompare(b.vremeOd))
            : [],
        );
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
  }, [selectedPlayroom, selectedDate]);

  useEffect(() => {
    if (selectedPlayroom) {
      loadTimeSlots();
    }
  }, [selectedPlayroom, selectedDate, loadTimeSlots]);

  const calculateDuration = (od, doVreme) => {
    if (!od || !doVreme) return "-";

    const [h1, m1] = od.split(":").map(Number);
    const [h2, m2] = doVreme.split(":").map(Number);

    const start = h1 * 60 + m1;
    const end = h2 * 60 + m2;

    const diff = end - start;

    const sati = Math.floor(diff / 60);
    const minuti = diff % 60;

    if (sati > 0 && minuti > 0) return `${sati}h ${minuti}min`;
    if (sati > 0) return `${sati}h`;
    return `${minuti}min`;
  };

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

  const getItemCalculationText = (item, segment) => {
    if (!item) return "";

    const cena = Number(item.cena) || 0;
    const tip = item.tip || "fiksno";
    const brojDece = Number(segment?.booking?.brojDece) || 0;
    const sati = getDurationHours(segment?.vremeOd, segment?.vremeDo);

    if (tip === "po_satu" || tip === "poSatu") {
      return `${cena} RSD × ${sati}h = ${cena * sati} RSD`;
    }

    if (tip === "po_osobi" || tip === "poOsobi") {
      return `${cena} RSD × ${brojDece} = ${cena * brojDece} RSD`;
    }

    return `${cena} RSD`;
  };

  const openManualBookingModal = (segment) => {
    if (!selectedPlayroom || !selectedDate || !selectedPlayroomData) {
      setError("Izaberi igraonicu i datum.");
      return;
    }

    const mode = selectedPlayroomData.rezimRezervacije;
    const isFiksno = mode === "fiksno";
    const timeSlotId = segment?.timeSlotId || segment?._id || "";

    if (isFiksno && !timeSlotId) {
      setError("Nedostaje ID fiksnog termina za ručnu rezervaciju.");
      return;
    }

    setManualSlot({
      ...segment,
      mode,
      datum: segment?.datum || selectedDate,
      playroomId: selectedPlayroom,
      timeSlotId,
      playroom: selectedPlayroomData,
    });
  };

  const handleManualBookingSubmit = async (payload) => {
    const result = await manualBookInterval(payload);

    if (!result?.success) {
      throw new Error(result?.error || "Ručna rezervacija nije uspela.");
    }

    setManualSlot(null);
    setExpandedBookingId(null);
    setMessage(result.message || "Termin je uspešno ručno zauzet.");
    await loadTimeSlots();
  };

  const getBookingId = (booking) => {
    return booking?._id || booking?.id || null;
  };

  const handleSlotClick = (segment) => {
    const bookingId = getBookingId(segment.booking);

    if (!bookingId) return;

    setExpandedBookingId((prev) => (prev === bookingId ? null : bookingId));
  };

  const occupiedSlots = timeSlots.filter(
    (segment) => segment.tip === "zauzeto",
  );

  const selectedPlayroomData =
    playrooms.find(
      (playroom) => String(playroom._id) === String(selectedPlayroom),
    ) || null;

  const freeSlots = timeSlots.filter(
    (segment) =>
      segment.tip === "slobodno" ||
      (segment.available === true && segment.zauzeto !== true),
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
    return (
      <div className="container loading" role="status" aria-live="polite">
        Učitavanje...
      </div>
    );
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
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="success-message" role="status" aria-live="polite">
          {message}
        </div>
      )}

      {playrooms.length === 0 ? (
        <div className="empty-state" role="status" aria-live="polite">
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
          <div className="owner-reservation-toolbar">
            <div className="filter-group owner-date-filter">
              <label htmlFor="owner-date-select">Izaberite datum</label>
              <input
                id="owner-date-select"
                type="date"
                value={selectedDate}
                min={getLocalDate()}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setMessage("");
                  setError("");
                  setExpandedBookingId(null);
                }}
              />
            </div>

            <div className="owner-reserve-info">
              Izaberi slobodan termin ispod za ručno zauzimanje.
            </div>
          </div>

          {!loadingSlots && freeSlots.length > 0 && (
            <div className="owner-free-slots-section">
              <h2>Slobodni termini</h2>

              <div className="slots-grid">
                {freeSlots.map((segment, index) => (
                  <div
                    key={`free-${segment._id || segment.timeSlotId || segment.vremeOd}-${segment.vremeDo}-${index}`}
                    className="slot-card slobodno"
                  >
                    <h3>
                      ⏰ {segment.vremeOd || "-"} - {segment.vremeDo || "-"}
                    </h3>

                    <p>
                      {selectedPlayroomData?.rezimRezervacije === "fiksno"
                        ? "Fiksni termin"
                        : "Slobodan interval"}
                    </p>

                    <p>
                      Trajanje:{" "}
                      {calculateDuration(segment.vremeOd, segment.vremeDo)}
                    </p>

                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => openManualBookingModal(segment)}
                    >
                      ➕ Ručno zauzmi
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingSlots ? (
            <div className="loading-slots" role="status" aria-live="polite">
              Učitavanje termina...
            </div>
          ) : freeSlots.length === 0 && occupiedSlots.length === 0 ? (
            <div className="empty-state" role="status" aria-live="polite">
              <p>Nema termina za izabrani datum.</p>
            </div>
          ) : occupiedSlots.length > 0 ? (
            <div className="owner-occupied-slots-section">
              <h2>Zauzeti termini</h2>

              <div className="slots-grid">
                {occupiedSlots.map((segment, index) => {
                  const phone = formatBookingPhone(segment.booking);
                  const phoneHref = getPhoneHref(phone);

                  return (
                    <div
                      key={`${segment.vremeOd}-${segment.vremeDo}-${index}`}
                      className={`slot-card clickable-slot ${
                        segment.tip === "zauzeto" ? "zauzeto" : "slobodno"
                      }`}
                    >
                      <div
                        className="owner-booking-card-header clickable-slot"
                        onClick={() => handleSlotClick(segment)}
                        role="button"
                        tabIndex={0}
                        aria-expanded={
                          expandedBookingId === getBookingId(segment.booking)
                        }
                        aria-controls={`owner-slot-booking-details-${getBookingId(segment.booking)}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSlotClick(segment);
                          }
                        }}
                      >
                        <div>
                          <h3>{formatBookingName(segment.booking)}</h3>

                          <p className="owner-booking-short-info">
                            🗓{" "}
                            {segment.booking?.datum
                              ? new Date(
                                  segment.booking.datum,
                                ).toLocaleDateString("sr-RS")
                              : selectedDate
                                ? new Date(selectedDate).toLocaleDateString(
                                    "sr-RS",
                                  )
                                : "-"}{" "}
                            | ⏰ {segment.vremeOd || "-"} -{" "}
                            {segment.vremeDo || "-"}
                          </p>
                        </div>

                        <div className="owner-booking-card-right">
                          <span className="owner-booking-status-badge">
                            Potvrđeno
                          </span>
                          <span
                            className={`owner-booking-arrow ${
                              expandedBookingId ===
                              getBookingId(segment.booking)
                                ? "open"
                                : ""
                            }`}
                          >
                            ▼
                          </span>
                        </div>
                      </div>

                      {expandedBookingId === getBookingId(segment.booking) && (
                        <div
                          id={`owner-slot-booking-details-${getBookingId(segment.booking)}`}
                          className="owner-booking-card-details"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p>✉️ {formatBookingEmail(segment.booking)}</p>
                          <p>
                            📞{" "}
                            {phoneHref ? <a href={phoneHref}>{phone}</a> : "-"}
                          </p>

                          <p>
                            🗓{" "}
                            {segment.booking?.datum
                              ? new Date(
                                  segment.booking.datum,
                                ).toLocaleDateString("sr-RS")
                              : selectedDate
                                ? new Date(selectedDate).toLocaleDateString(
                                    "sr-RS",
                                  )
                                : "-"}
                          </p>

                          <p>
                            ⏰ {segment.vremeOd || "-"} -{" "}
                            {segment.vremeDo || "-"}
                          </p>

                          <p>👶 Broj dece: {segment.booking?.brojDece ?? 0}</p>
                          <p>
                            👨‍👩‍👧 Broj roditelja:{" "}
                            {segment.booking?.brojRoditelja ?? 0}
                          </p>
                          <p>
                            💰 Ukupna cena: {segment.booking?.ukupnaCena ?? 0}{" "}
                            RSD
                          </p>
                          {Array.isArray(segment.booking?.izabraneCene) &&
                            segment.booking.izabraneCene.length > 0 && (
                              <div className="owner-booking-extra-block">
                                <p>
                                  <strong>Izabrane stavke:</strong>
                                </p>

                                {segment.booking.izabraneCene.map(
                                  (item, idx) => (
                                    <p key={`cena-${idx}`}>
                                      • {item.naziv} ({item.tip || "fiksno"}) -{" "}
                                      {getItemCalculationText(item, segment)}
                                      {item.opis && <span> - {item.opis}</span>}
                                    </p>
                                  ),
                                )}
                              </div>
                            )}

                          {segment.booking?.izabraniPaket?.naziv && (
                            <div className="owner-booking-extra-block">
                              <p>
                                <strong>Paket:</strong>{" "}
                                {segment.booking.izabraniPaket.naziv} (
                                {segment.booking.izabraniPaket.tip || "fiksno"})
                                -{" "}
                                {getItemCalculationText(
                                  segment.booking.izabraniPaket,
                                  segment,
                                )}
                              </p>

                              {segment.booking.izabraniPaket.opis && (
                                <p>- {segment.booking.izabraniPaket.opis}</p>
                              )}
                            </div>
                          )}

                          {Array.isArray(segment.booking?.izabraneUsluge) &&
                            segment.booking.izabraneUsluge.length > 0 && (
                              <div className="owner-booking-extra-block">
                                <p>
                                  <strong>Dodatne usluge:</strong>
                                </p>

                                {segment.booking.izabraneUsluge.map(
                                  (item, idx) => (
                                    <p key={`usluga-${idx}`}>
                                      • {item.naziv} ({item.tip || "fiksno"}) -{" "}
                                      {getItemCalculationText(item, segment)}
                                      {item.opis && <span> - {item.opis}</span>}
                                    </p>
                                  ),
                                )}
                              </div>
                            )}

                          {segment.booking?.napomena && (
                            <p>📝 Napomena: {segment.booking.napomena}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </>
      )}

      {manualSlot && (
        <ManualBookingModal
          slot={manualSlot}
          onClose={() => setManualSlot(null)}
          onSubmit={handleManualBookingSubmit}
        />
      )}
    </div>
  );
};

export default OwnerTimeSlots;
