import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyPlayrooms } from "../services/playroomService";
import {
  getAllTimeSlotsForOwner,
  confirmBooking,
  cancelBooking,
} from "../services/bookingService";
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
  const [activeTab, setActiveTab] = useState(null);
  const [error, setError] = useState("");

  const [expandedBookingId, setExpandedBookingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState("");
  const [cancellingId, setCancellingId] = useState("");
  const [cancelConfirmBooking, setCancelConfirmBooking] = useState(null);

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
  }, []);

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

  const openManualBookingPage = (segment) => {
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

    const query = new URLSearchParams({
      mode: "owner",
      datum: selectedDate,
    });

    if (isFiksno) {
      query.set("timeSlotId", timeSlotId);
    }

    if (segment?.vremeOd) {
      query.set("vremeOd", segment.vremeOd);
    }

    if (segment?.vremeDo) {
      query.set("vremeDo", segment.vremeDo);
    }

    navigate(
      `/book/${encodeURIComponent(selectedPlayroom)}?${query.toString()}`,
    );
  };

  const getBookingId = (booking) => {
    return booking?._id || booking?.id || null;
  };

  const getSlotExpandId = (segment, index = "") => {
    return String(
      getBookingId(segment.booking) ||
        segment?.timeSlotId ||
        segment?._id ||
        `${segment?.vremeOd || ""}-${segment?.vremeDo || ""}-${index}`,
    );
  };

  const handleSlotClick = (segment, index = "") => {
    const slotExpandId = getSlotExpandId(segment, index);

    setExpandedBookingId((prev) => {
      const isClosing = prev === slotExpandId;

      if (!isClosing) {
        setTimeout(() => {
          const detailsElement = document.getElementById(
            `owner-slot-booking-details-${slotExpandId}`,
          );

          if (!detailsElement) return;

          const elementTop =
            detailsElement.getBoundingClientRect().top + window.pageYOffset;

          window.scrollTo({
            top: Math.max(elementTop - 120, 0),
            behavior: "smooth",
          });
        }, 120);
      }

      return isClosing ? null : slotExpandId;
    });
  };

  const handleConfirmBooking = async (segment) => {
    const bookingId = getBookingId(segment?.booking);

    if (!bookingId) {
      setError("Nedostaje ID rezervacije za potvrdu.");
      return;
    }

    if (confirmingId || cancellingId) return;

    try {
      setConfirmingId(bookingId);
      setError("");
      setMessage("");

      const result = await confirmBooking(bookingId);

      if (result?.success) {
        setMessage(result.message || "Rezervacija je potvrđena.");
        await loadTimeSlots();
      } else {
        setError(result?.error || "Greška pri potvrdi rezervacije.");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri potvrdi rezervacije.",
      );
    } finally {
      setConfirmingId("");
    }
  };

  const openCancelConfirm = (segment) => {
    const booking = segment?.booking;
    const bookingId = getBookingId(booking);

    if (!bookingId || confirmingId || cancellingId) return;

    setCancelConfirmBooking({
      ...booking,
      _id: bookingId,
      vremeOd: booking?.vremeOd || segment?.vremeOd || "",
      vremeDo: booking?.vremeDo || segment?.vremeDo || "",
      datum: booking?.datum || selectedDate,
    });
  };

  const closeCancelConfirm = () => {
    if (cancellingId) return;

    setCancelConfirmBooking(null);
  };

  const handleCancelBooking = async () => {
    const bookingId = cancelConfirmBooking?._id;

    if (!bookingId) {
      setError("Nedostaje ID rezervacije za otkazivanje.");
      return;
    }

    if (cancellingId) return;

    try {
      setCancellingId(bookingId);
      setError("");
      setMessage("");

      const result = await cancelBooking(bookingId);

      if (result?.success) {
        setMessage(result.message || "Rezervacija je otkazana.");
        setCancelConfirmBooking(null);
        setExpandedBookingId(null);
        await loadTimeSlots();
      } else {
        setError(result?.error || "Greška pri otkazivanju rezervacije.");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri otkazivanju rezervacije.",
      );
    } finally {
      setCancellingId("");
    }
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
      segment.tip === "slobodno" &&
      segment.zauzeto !== true &&
      segment.isPast !== true &&
      segment.available !== false,
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

  const getBookingStatusLabel = (status = "") => {
    const normalizedStatus = String(status || "").toLowerCase();

    if (normalizedStatus === "cekanje") return "Čeka potvrdu";
    if (normalizedStatus === "potvrdjeno") return "Potvrđeno";
    if (normalizedStatus === "otkazano") return "Otkazano";
    if (normalizedStatus === "zavrseno") return "Završeno";

    return "Zauzeto";
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
                  setActiveTab(null);
                }}
              />
            </div>
          </div>

          <div className="owner-slots-tabs" aria-label="Pregled termina">
            <button
              type="button"
              className={`owner-slot-tab ${activeTab === "free" ? "active" : ""}`}
              onClick={() => {
                setActiveTab((prev) => (prev === "free" ? null : "free"));
                setExpandedBookingId(null);
              }}
              aria-expanded={activeTab === "free"}
            >
              <span>✅ Slobodni termini</span>
              <strong>{freeSlots.length}</strong>
            </button>

            <button
              type="button"
              className={`owner-slot-tab ${activeTab === "occupied" ? "active" : ""}`}
              onClick={() => {
                setActiveTab((prev) =>
                  prev === "occupied" ? null : "occupied",
                );
                setExpandedBookingId(null);
              }}
              aria-expanded={activeTab === "occupied"}
            >
              <span>🔒 Zauzeti termini</span>
              <strong>{occupiedSlots.length}</strong>
            </button>
          </div>

          {!loadingSlots && activeTab === "free" && freeSlots.length > 0 && (
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
                      onClick={() => openManualBookingPage(segment)}
                    >
                      ➕ Rezervisi
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
          ) : activeTab === "free" && freeSlots.length === 0 ? (
            <div className="empty-state" role="status" aria-live="polite">
              <p>Nema slobodnih termina za izabrani datum.</p>
            </div>
          ) : activeTab === "occupied" && occupiedSlots.length === 0 ? (
            <div className="empty-state" role="status" aria-live="polite">
              <p>Nema zauzetih termina za izabrani datum.</p>
            </div>
          ) : activeTab === "occupied" && occupiedSlots.length > 0 ? (
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
                        onClick={() => handleSlotClick(segment, index)}
                        role="button"
                        tabIndex={0}
                        aria-expanded={
                          expandedBookingId === getSlotExpandId(segment, index)
                        }
                        aria-controls={`owner-slot-booking-details-${getSlotExpandId(segment, index)}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSlotClick(segment, index);
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
                            {getBookingStatusLabel(segment.booking?.status)}
                          </span>
                          <span className="owner-booking-arrow">
                            {expandedBookingId ===
                            getSlotExpandId(segment, index)
                              ? "▲"
                              : "▼"}
                          </span>
                        </div>
                      </div>

                      {expandedBookingId ===
                        getSlotExpandId(segment, index) && (
                        <div
                          id={`owner-slot-booking-details-${getSlotExpandId(segment, index)}`}
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
                          {String(
                            segment.booking?.status || "",
                          ).toLowerCase() === "cekanje" && (
                            <button
                              type="button"
                              className="btn-confirm-booking"
                              onClick={() => handleConfirmBooking(segment)}
                              disabled={
                                confirmingId ===
                                  getBookingId(segment.booking) ||
                                cancellingId === getBookingId(segment.booking)
                              }
                              aria-busy={
                                confirmingId === getBookingId(segment.booking)
                              }
                            >
                              {confirmingId === getBookingId(segment.booking)
                                ? "Potvrđujem..."
                                : "✅ Potvrdi rezervaciju"}
                            </button>
                          )}

                          {["cekanje", "potvrdjeno"].includes(
                            String(segment.booking?.status || "").toLowerCase(),
                          ) && (
                            <button
                              type="button"
                              className="btn-cancel-booking"
                              onClick={() => openCancelConfirm(segment)}
                              disabled={
                                cancellingId ===
                                  getBookingId(segment.booking) ||
                                confirmingId === getBookingId(segment.booking)
                              }
                              aria-busy={
                                cancellingId === getBookingId(segment.booking)
                              }
                            >
                              {cancellingId === getBookingId(segment.booking)
                                ? "Otkazujem..."
                                : "❌ Otkaži rezervaciju"}
                            </button>
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
      {cancelConfirmBooking && (
        <div
          className="owner-cancel-confirm-overlay"
          onClick={closeCancelConfirm}
        >
          <div
            className="owner-cancel-confirm-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Potvrda otkazivanja rezervacije"
          >
            <h2>Otkazivanje rezervacije</h2>

            <p>
              Da li ste sigurni da želite da otkažete rezervaciju za{" "}
              <strong>
                {cancelConfirmBooking.imeRoditelja ||
                  cancelConfirmBooking.ime ||
                  ""}{" "}
                {cancelConfirmBooking.prezimeRoditelja ||
                  cancelConfirmBooking.prezime ||
                  ""}
              </strong>
              ?
            </p>

            <div className="owner-cancel-booking-info">
              <span>
                📅{" "}
                {cancelConfirmBooking.datum
                  ? new Date(cancelConfirmBooking.datum).toLocaleDateString(
                      "sr-RS",
                    )
                  : "-"}
              </span>

              <span>
                ⏰ {cancelConfirmBooking.vremeOd || "-"} -{" "}
                {cancelConfirmBooking.vremeDo || "-"}
              </span>
            </div>

            <div className="owner-cancel-confirm-actions">
              <button
                type="button"
                className="owner-cancel-keep-btn"
                onClick={closeCancelConfirm}
                disabled={cancellingId === cancelConfirmBooking._id}
              >
                Ne, zadrži rezervaciju
              </button>

              <button
                type="button"
                className="owner-cancel-confirm-btn"
                onClick={handleCancelBooking}
                disabled={cancellingId === cancelConfirmBooking._id}
                aria-busy={cancellingId === cancelConfirmBooking._id}
              >
                {cancellingId === cancelConfirmBooking._id
                  ? "Otkazujem..."
                  : "Da, otkaži rezervaciju"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerTimeSlots;
